/*
 * Derived from the AMLL TTML Tool; the renderer logic it implements
 * follows the Spicy Lyrics renderer (AGPL-3.0-or-later,
 * https://github.com/Spikerko/Spicy-Lyrics).
 *
 * Immediate origin: AMLL TTML Tool (NaeNae-AMLL-TTML-TOOL, AGPL-3.0),
 * src/components/SpicyLyrics/active-line.ts
 * Ported to TypeScript + plain DOM for SaltyLyrics.
 * Changes: none (logic copied as is).
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import { stateAt } from "./math";

type TimedLine = { startTime: number; endTime: number };

/** Preserve Spicy's overlap policy: adjacent duet lines share the first anchor. */
export function findSpicyActiveIndex(lines: TimedLine[], timeMs: number) {
	const indices = lines.flatMap((line, index) =>
		stateAt(timeMs, line.startTime, line.endTime) === "active" ? [index] : [],
	);
	const first = indices[0] ?? -1;
	const last = indices[indices.length - 1] ?? first;
	return last - first <= 1 ? first : last;
}

export function findSpicyScrollIndex(lines: TimedLine[], timeMs: number) {
	if (lines.every((line) => timeMs >= line.endTime)) return lines.length - 1;
	return findSpicyActiveIndex(lines, timeMs);
}
