/*
 * Derived from the AMLL TTML Tool (AGPL-3.0); the renderer logic under test
 * follows the Spicy Lyrics renderer (AGPL-3.0-or-later,
 * https://github.com/Spikerko/Spicy-Lyrics).
 *
 * Immediate origin: src/components/SpicyLyrics/active-line.test.ts
 * Changes: none.
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import { describe, expect, it } from "vitest";
import { findSpicyActiveIndex, findSpicyScrollIndex } from "./active-line";

describe("Spicy active scroll anchor", () => {
	it("preserves the first anchor for adjacent duet lines", () => {
		expect(
			findSpicyActiveIndex(
				[
					{ startTime: 100, endTime: 500 },
					{ startTime: 100, endTime: 500 },
				],
				200,
			),
		).toBe(0);
	});
	it("uses the last anchor when overlapping lines are separated", () => {
		expect(
			findSpicyActiveIndex(
				[
					{ startTime: 100, endTime: 500 },
					{ startTime: 600, endTime: 700 },
					{ startTime: 100, endTime: 500 },
				],
				200,
			),
		).toBe(2);
	});
	it("keeps end-of-song anchoring, gaps and empty lyrics", () => {
		const lines = [
			{ startTime: 100, endTime: 200 },
			{ startTime: 400, endTime: 500 },
		];
		expect(findSpicyScrollIndex(lines, 0)).toBe(-1);
		expect(findSpicyScrollIndex(lines, 300)).toBe(-1);
		expect(findSpicyScrollIndex(lines, 500)).toBe(1);
		expect(findSpicyScrollIndex([], 0)).toBe(-1);
	});
});
