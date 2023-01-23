/*
 * Copyright (c) 2023 LambdAurora <email@lambdaurora.dev>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Middleware} from "@oak/middleware.ts";
import {send} from "@oak/send.ts";
import * as path from "@std/path/mod.ts";

export type FilePathMode = "strict" | "redirect_to_html" | "serve_without_html_ext";

export interface StaticFileServingOptions {
	/**
	 * `true` if folder paths are accepted and redirect to their respective `index.html` files, or `false` otherwise.
	 *
	 * @default true
	 */
	folder_path_to_index?: boolean;
	/**
	 * Determines how file paths that don't have a direct hit are handled if the accepted content type is HTML.
	 *
	 * @default "redirect_to_html"
	 */
	file_path_without_html_ext?: FilePathMode;
	/**
	 * `true` if brotli variants of files should be searched and sent instead when possible, or `false` otherwise
	 *
	 * @default true
	 */
	brotli?: boolean;
}

async function test_file(path: string) {
	// Try opening the file.
	let file: Deno.FsFile;
	try {
		file = await Deno.open(path, {read: true});
		const stat = await file.stat();

		return stat.isFile;
	} catch {
		return false;
	}
}

/**
 * Creates a middleware serving the files from the given root path.
 *
 * @param root_path the root path where the files reside
 * @param options the serving options
 * @return {Middleware} the middleware
 */
export function serve_files(root_path: string, options?: StaticFileServingOptions): Middleware {
	const known_options = {
		folder_path_to_index: true,
		file_path_without_html_ext: "redirect_to_html",
		brotli: true
	};
	if (options) Object.assign(known_options, options);

	return async (context, next) => {
		const accept_html = context.request.headers.get("accept")?.includes("text/html");
		let file_path = decodeURIComponent(context.request.url.pathname);
		const expect_directory = file_path.endsWith("/");
		let should_try_directory = known_options.folder_path_to_index;

		if (!path.normalize(root_path + file_path).startsWith(root_path)) {
			// Someone tried to sneak up and access files outside the root directory.
			return await next();
		}

		async function attempt_to_serve_with_html_ext(p: string) {
			if (known_options.file_path_without_html_ext === "redirect_to_html") {
				context.response.redirect(p);
			} else {
				await attempt_to_serve(root_path + p);
			}
		}

		async function attempt_to_serve(p: string) {
			await send(context, p, {
				root: "",
				brotli: known_options.brotli
			});
		}

		if (expect_directory) {
			if (!accept_html) {
				// The client wants a non-HTML file but gave a directory path.
				// We cannot predict exactly what file it wants then, so give up.
				return;
			}

			should_try_directory = false;

			if (known_options.folder_path_to_index) {
				const search_path = root_path + file_path + "index.html";

				if (await test_file(search_path)) {
					// Hooray, we found the index file.
					await attempt_to_serve(search_path);
					return;
				} else if (known_options.file_path_without_html_ext !== "strict") {
					const new_path = file_path.replace(/\/$/, ".html");
					// We're not in strict mode, so we can try a file with the same name!
					if (await test_file(root_path + new_path)) {
						await attempt_to_serve_with_html_ext(new_path);
						return;
					}
				} else return; // It's in strict mode, we're out of luck.
			}

			if (known_options.file_path_without_html_ext === "strict") return;
			file_path = file_path.substring(0, file_path.length - 1);
		}

		if (await test_file(root_path + file_path)) {
			// We found the file so let's serve it!
			await attempt_to_serve(root_path + file_path);
		} else if (accept_html && !file_path.endsWith(".html") && known_options.file_path_without_html_ext !== "strict") {
			// We know we want an HTML file, and the file doesn't end with .html... Let's try by adding the extension.
			const html_file_path = file_path + ".html";

			if (await test_file(root_path + html_file_path)) {
				// Yay! The file with the .html exists, time to serve.
				await attempt_to_serve_with_html_ext(html_file_path);
			} else if (should_try_directory && await test_file(root_path + file_path + "/index.html")) {
				// The file did not exist, but we had one last chance: testing for directories, and it worked!
				if (known_options.file_path_without_html_ext === "redirect_to_html") {
					context.response.redirect(file_path + "/");
				} else {
					await attempt_to_serve(root_path + file_path + "/index.html");
				}
			}
		}
	};
}
