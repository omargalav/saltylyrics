/*
 * Helpers de test (no forman parte del bundle). Sustituyen a
 * `newLyricLine` / `newLyricWord` de `$/types/ttml` del TTML Tool.
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import type { LyricLine, LyricWord } from "./types";

let counter = 0;
const uid = () => `t${++counter}`;

export const newLyricWord = (): LyricWord => ({
	id: uid(),
	startTime: 0,
	endTime: 0,
	word: "",
	romanWord: "",
});

export const newLyricLine = (): LyricLine => ({
	id: uid(),
	words: [],
	translatedLyric: "",
	romanLyric: "",
	isBG: false,
	isDuet: false,
	startTime: 0,
	endTime: 0,
	isLineSynced: false,
});
