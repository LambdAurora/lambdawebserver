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

import {compose, Middleware} from "@oak/middleware.ts";
import {ALL_HTTP_METHODS, HttpMethod, HttpStatus} from "../http.ts";
import {Context} from "@oak/context.ts";

/**
 * Represents the redirect policy for proxying.
 *
 * - `follow` means the server will quietly follow the redirect and proxy the result of the redirect;
 * - `rewrite` means the server will attempt to reinterpret the given proxy URL if the redirect URL is relative, otherwise use the `forward` rule;
 * - `forward` means the server will forward the redirect request to the client.
 */
export type ProxyRedirectPolicy = "forward" | "rewrite" | "follow";

/**
 * Represents the proxy path mode.
 *
 * - `single` means only the given proxy path will be proxied;
 * - `root` means the given proxy path will act as a proxy root where the matching checks if the URL path starts with the proxy path,
 *   and the rest of the path is given to the redirect URL.
 */
export type ProxyPathMode = "single" | "root";

export type RoutePathMatcher = string | RegExp;

export interface ProxyRouteOptions {
	path_mode?: ProxyPathMode;
	exclude_paths?: RoutePathMatcher[];
	redirect?: ProxyRedirectPolicy;
}

export class ProxyRoute {
	private readonly insensitive_path: string;
	private readonly path_mode: ProxyPathMode = "single";
	private readonly redirect_policy: ProxyRedirectPolicy;

	constructor(
		private readonly methods: HttpMethod[] | Readonly<HttpMethod[]>,
		private readonly path: string,
		private readonly target: URL,
		private readonly options?: ProxyRouteOptions
	) {
		this.insensitive_path = path.toLowerCase();

		if (this.options?.path_mode) this.path_mode = this.options.path_mode;
		this.redirect_policy = this.options?.redirect ? this.options.redirect : "follow";
	}

	private get_target_path(given: string) {
		if (this.path_mode === "single") return this.insensitive_path === given.toLowerCase() ? "" : null;
		else if (given.toLowerCase().startsWith(this.insensitive_path)) return given.substring(this.path.length);
		else return null;
	}

	private async resolve_response(ctx: Context, request_headers: Headers, url: URL, target_url: URL): Promise<Response | null> {
		const response = await fetch(target_url, {
			headers: request_headers,
			method: ctx.request.method,
			body: ctx.request.hasBody ? ctx.request.body.stream : undefined,
			redirect: this.redirect_policy === "follow" ? "follow" : "manual"
		});

		const headers = new Headers(response.headers);

		function reply() {
			return new Response(response.body, {
				headers: headers,
				status: response.status,
				statusText: response.statusText
			});
		}

		if (response.status === HttpStatus.NotFound) {
			return null;
		} else if (response.status === HttpStatus.MovedPermanently && this.redirect_policy === "rewrite") {
			const location = response.headers.get("location");
			if (!location) return null;
			const target = new URL(location);

			if (target.origin === target_url.origin && target.pathname.startsWith(this.target.pathname)) {
				// We can rewrite the location.
				const rewritten_url = new URL(url);
				const where_to_go = target.pathname.substring(this.target.pathname.length);
				rewritten_url.pathname = this.path + where_to_go;

				headers.set("location", rewritten_url.href);

				return reply();
			} else {
				return reply();
			}
		} else {
			return reply();
		}
	}

	public middleware(): Middleware {
		return async (ctx, next) => {
			if (!this.methods.includes(ctx.request.method as HttpMethod)) return await next();

			const url_path = decodeURIComponent(ctx.request.url.pathname);
			const found = this.get_target_path(url_path);

			if (found !== null) {
				if (this.options?.exclude_paths) {
					for (const exclude of this.options.exclude_paths) {
						if (typeof exclude === "string") {
							if (url_path === exclude) return await next();
						} else {
							if (exclude.test(url_path)) return await next();
						}
					}
				}

				const headers = new Headers(ctx.request.headers);
				headers.set("host", this.target.host);

				const proxy_url = new URL(this.target);
				proxy_url.pathname += found;

				const response = await this.resolve_response(ctx, headers, ctx.request.url, proxy_url);

				if (response === null) {
					return await next();
				}

				ctx.response.headers = response.headers;
				ctx.response.body = response.body;
				ctx.response.status = response.status;
			} else {
				return await next();
			}
		};
	}
}

export class ProxyRouter {
	private routes: ProxyRoute[] = [];

	/**
	 * Adds a proxy route for all HTTP methods.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	all(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(ALL_HTTP_METHODS, path, new URL(target), options));
		return this;
	}

	/**
	 * Adds a proxy route for the HTTP DELETE method.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	delete(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(["DELETE"], path, new URL(target), options));
		return this;
	}

	/**
	 * Adds a proxy route for the HTTP GET method.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	get(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(["GET"], path, new URL(target), options));
		return this;
	}

	/**
	 * Adds a proxy route for the HTTP HEAD method.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	head(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(["HEAD"], path, new URL(target), options));
		return this;
	}

	/**
	 * Adds a proxy route for the HTTP OPTIONS method.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	options(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(["OPTIONS"], path, new URL(target), options));
		return this;
	}

	/**
	 * Adds a proxy route for the HTTP PATCH method.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	patch(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(["PATCH"], path, new URL(target), options));
		return this;
	}

	/**
	 * Adds a proxy route for the HTTP POST method.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	post(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(["POST"], path, new URL(target), options));
		return this;
	}

	/**
	 * Adds a proxy route for the HTTP PUT method.
	 *
	 * @param path the path to proxy
	 * @param target the proxy destination
	 * @param options the proxy options
	 * @return {ProxyRouter} `this`
	 */
	put(path: string, target: URL | string, options?: ProxyRouteOptions) {
		this.routes.push(new ProxyRoute(["PUT"], path, new URL(target), options));
		return this;
	}

	/**
	 * Returns the proxy middleware.
	 *
	 * @return the middleware
	 */
	proxy(): Middleware {
		if (this.routes.length === 0) {
			throw new Error("No proxy routes have been specified.");
		} else if (this.routes.length === 1) {
			return this.routes[0].middleware();
		} else {
			return compose(this.routes.map(route => route.middleware()));
		}
	}
}
