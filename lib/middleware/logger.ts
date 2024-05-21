/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lambdawebserver.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { bold, cyan, green, magenta, red, yellow } from "@std/fmt/colors";
import { format } from "@std/datetime";
import { Middleware } from "@oak/oak";

/**
 * Represents a logger middleware which will log any request made to the web server.
 */
export class LoggerMiddleware {
	private date_format: string | null = "yyyy-MM-dd hh:mm:ss.SSS";

	/**
	 * Sets the date format to use or `null` to not have date display.
	 *
	 * @param format the format of the date to log, or `null` to not log date
	 * @returns this logger middleware
	 */
	public with_date_format(format: string | null): this {
		this.date_format = format;
		return this;
	}

	/**
	 * Formats the given HTTP status as a printable string.
	 *
	 * @param status the HTTP status
	 * @returns a printable string
	 */
	format_status(status: number): string {
		let color = red;

		if (status < 500 && status >= 400) {
			color = yellow;
		} else if (status >= 300) {
			color = cyan;
		} else if (status >= 200) {
			color = green;
		}

		return bold(color(String(status)));
	}

	/**
	 * Returns the middleware of this logger.
	 *
	 * @returns the Oak middleware
	 */
	public middleware(): Middleware {
		return async (ctx, next) => {
			const result = await next();

			const user_agent = ctx.request.headers.get("user-agent");
			const status = ctx.response.status;

			const date = this.date_format !== null ? magenta(`[${format(new Date(), this.date_format)}] `) : "";

			console.log(`${date}${bold(green(`${ctx.request.method} ${ctx.request.url.pathname}`))} from: "${user_agent}" => ${this.format_status(status)}`);

			return result;
		};
	}
}
