/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lambdawebserver.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Represents a valid HTTP method.
 */
export type HttpMethod =
	| "DELETE"
	| "GET"
	| "HEAD"
	| "OPTIONS"
	| "PATCH"
	| "POST"
	| "PUT";

/**
 * All the existing HTTP methods.
 */
export const ALL_HTTP_METHODS: readonly HttpMethod[] = Object.freeze(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);

/**
 * Returns the accepted encoding from the given headers.
 *
 * @param headers the HTTP headers
 * @returns the accepted encoding
 */
export function get_accepted_encodings(headers: Headers): string[] {
	const raw = headers.get("accept-encoding");

	if (raw) return raw.split(", ");
	else return [];
}

export { STATUS_CODE as HttpStatus } from "@std/http";
