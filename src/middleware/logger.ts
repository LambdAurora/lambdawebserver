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

import {bold, cyan, green, magenta, red, yellow} from "@std/fmt/colors.ts";
import {format} from "@std/datetime/mod.ts";
import {Middleware} from "@oak/mod.ts";

/**
 * Represents a logger middleware which will log any request made to the web server.
 */
export class LoggerMiddleware {
	private date_format: string | null = "yyyy-MM-dd hh:mm:ss.SSS";

	/**
	 * Sets the date format to use or `null` to not have date display.
	 * @param format the format of the date to log, or `null` to not log date
	 * @return `this`
	 */
	public with_date_format(format: string | null) {
		this.date_format = format;
		return this;
	}

	/**
	 * Formats the given HTTP status as a printable string.
	 *
	 * @param status the HTTP status
	 * @return a printable string
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
	 * @return the middleware
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
