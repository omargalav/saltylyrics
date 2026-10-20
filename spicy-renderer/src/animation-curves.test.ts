/*
 * Derived from the AMLL TTML Tool (AGPL-3.0); the renderer logic under test
 * follows the Spicy Lyrics renderer (AGPL-3.0-or-later,
 * https://github.com/Spikerko/Spicy-Lyrics).
 *
 * Immediate origin: src/components/SpicyLyrics/animation-curves.test.ts
 * Changes: none.
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import { describe, expect, it } from "vitest";
import {
	dotOpacitySpline,
	dotScaleSpline,
	easeSinOut,
	glowSpline,
	letterScaleSpline,
	lineGlowSpline,
	scaleSpline,
	simpleLetterScaleSpline,
	simpleYSpline,
	ySpline,
} from "./animation-curves";

describe("Spicy animation curves", () => {
	it("preserves resting/sung scales and the smaller simple-mode held-letter peak", () => {
		expect(scaleSpline.at(0)).toBeCloseTo(0.95);
		expect(scaleSpline.at(1)).toBeCloseTo(1);
		expect(letterScaleSpline.at(0.7)).toBeCloseTo(1.175);
		expect(simpleLetterScaleSpline.at(0.7)).toBeCloseTo(1.07);
		expect(dotScaleSpline.at(0)).toBeCloseTo(0.75);
	});
	it("retains glow, travel and dot opacity endpoints", () => {
		expect(glowSpline.at(0)).toBeCloseTo(0);
		expect(glowSpline.at(0.6)).toBeCloseTo(1);
		expect(lineGlowSpline.at(0.5)).toBeCloseTo(1);
		expect(ySpline.at(1)).toBeCloseTo(0);
		expect(simpleYSpline.at(1)).toBeCloseTo(-0.033);
		expect(dotOpacitySpline.at(0)).toBeCloseTo(0.35);
		expect(dotOpacitySpline.at(1)).toBeCloseTo(1);
		expect(easeSinOut(0)).toBe(0);
		expect(easeSinOut(1)).toBe(1);
	});
});
