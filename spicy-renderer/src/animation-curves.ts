/*
 * Adapted from the Spicy Lyrics renderer (AGPL-3.0-or-later).
 * Original project: https://github.com/Spikerko/Spicy-Lyrics
 *
 * Immediate origin: AMLL TTML Tool (NaeNae-AMLL-TTML-TOOL, AGPL-3.0),
 * src/components/SpicyLyrics/animation-curves.ts
 * Ported to TypeScript + plain DOM for SaltyLyrics.
 * Changes: none (logic copied as is).
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import { CubicSpline } from "./math";
export const scaleSpline = new CubicSpline([
	[0, 0.95],
	[0.7, 1.0505],
	[1, 1],
]);
export const letterScaleSpline = new CubicSpline([
	[0, 0.95],
	[0.7, 1.175],
	[1, 1],
]);
export const ySpline = new CubicSpline([
	[0, 0.01],
	[0.9, -1 / 60],
	[1, 0],
]);
export const letterYSpline = new CubicSpline([
	[0, 0.01],
	[0.9, -1 / 56],
	[1, 0],
]);
export const simpleYSpline = new CubicSpline([
	[0, 0.01],
	[1, -0.033],
]);
export const simpleLetterScaleSpline = new CubicSpline([
	[0, 0.95],
	[0.7, 1.07],
	[1, 1],
]);
export const simpleLetterYSpline = new CubicSpline([
	[0, 0.01],
	[0.9, -1 / 62],
	[1, 0],
]);
export const glowSpline = new CubicSpline([
	[0, 0],
	[0.15, 1],
	[0.6, 1],
	[1, 0],
]);
export const lineGlowSpline = new CubicSpline([
	[0, 0],
	[0.5, 1],
	[1, 0],
]);
export const dotScaleSpline = new CubicSpline([
	[0, 0.75],
	[0.7, 1.05],
	[1, 1],
]);
export const dotYSpline = new CubicSpline([
	[0, 0],
	[0.9, -0.12],
	[1, 0],
]);
export const dotGlowSpline = new CubicSpline([
	[0, 0],
	[0.6, 1],
	[1, 1],
]);
export const dotOpacitySpline = new CubicSpline([
	[0, 0.35],
	[0.6, 1],
	[1, 1],
]);
export const simpleDotOpacitySpline = new CubicSpline([
	[0, 0.27],
	[0.6, 1],
	[1, 1],
]);
export const easeSinOut = (progress: number) =>
	Math.sin((Math.PI * progress) / 2);
