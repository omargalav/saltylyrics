/*
 * Adaptador de datos: respuesta de la API de Spicy Lyrics (`data.Body`,
 * tiempos en SEGUNDOS) → `LyricLine[]` del renderizador (tiempos en MS).
 * Archivo nuevo del port; no existe en el TTML Tool.
 *
 * Es el único lugar que conoce el formato de la API. `buildSpicyLines`
 * (model.ts) recibe su salida sin cambios.
 *
 * Convención de espacios (la misma que ya usa `sylsToWords` en index.html):
 * cada sílaba lleva el espacio DESPUÉS de sí misma, salvo `IsPartOfWord`.
 * El TTML Tool representa ese espacio como una "palabra" de solo espacios y
 * tiempo cero, así que se inserta `{ word: " ", startTime: 0, endTime: 0 }`
 * después de cada sílaba que NO esté pegada a la siguiente.
 *
 * Licencia: AGPL-3.0-or-later (ver LICENSE).
 */
import type { LyricLine, LyricWord, SpicyBody, SpicySyllable, SpicyVocalGroup } from "./types";

const toMs = (seconds: number | undefined) => Math.round((seconds || 0) * 1000);

interface Piece {
	text: string;
	startTime: number;
	endTime: number;
	/** true = pegada a la siguiente sílaba (sin espacio). */
	joined: boolean;
}

/**
 * Equivale a `sylsToWords` de index.html: recorta el texto, quita paréntesis
 * en coros y decide si cada sílaba se pega a la siguiente.
 */
function toPieces(syllables: SpicySyllable[] | undefined, background: boolean): Piece[] {
	const out: Piece[] = [];
	for (const syllable of syllables ?? []) {
		let raw = String(syllable.Text ?? "");
		if (background) raw = raw.replace(/[()]/g, "");
		const text = raw.trim();
		const previous = out[out.length - 1];
		// Un espacio al principio de esta sílaba separa de la anterior.
		if (previous && /^\s/.test(raw)) previous.joined = false;
		if (!text) {
			if (previous) previous.joined = false;
			continue;
		}
		out.push({
			text,
			startTime: toMs(syllable.StartTime),
			endTime: toMs(syllable.EndTime),
			joined: !!syllable.IsPartOfWord && !/\s$/.test(raw),
		});
	}
	return out;
}

const joinText = (pieces: Piece[]) =>
	pieces
		.map((piece) => piece.text + (piece.joined ? "" : " "))
		.join("")
		.trim();

const isNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

function makeLine(
	id: string,
	group: SpicyVocalGroup,
	background: boolean,
	duet: boolean,
	lineSynced: boolean,
): LyricLine | null {
	const pieces = toPieces(group.Syllables, background);
	const plain = pieces.length ? joinText(pieces) : String(group.Text ?? "").trim();
	if (!plain) return null;

	// Tiempos de la línea: los del grupo; si faltan, los de sus sílabas.
	const startTime = isNumber(group.StartTime)
		? toMs(group.StartTime)
		: (pieces[0]?.startTime ?? 0);
	const endTime = isNumber(group.EndTime)
		? toMs(group.EndTime)
		: (pieces[pieces.length - 1]?.endTime ?? 0);

	const words: LyricWord[] = [];
	if (lineSynced) {
		// Una única palabra que cubre toda la línea.
		words.push({ id: `${id}w0`, word: plain, romanWord: "", startTime, endTime });
	} else {
		pieces.forEach((piece, index) => {
			words.push({
				id: `${id}w${index}`,
				word: piece.text,
				romanWord: "",
				startTime: piece.startTime,
				endTime: piece.endTime,
			});
			if (!piece.joined)
				words.push({ id: `${id}s${index}`, word: " ", romanWord: "", startTime: 0, endTime: 0 });
		});
	}

	return {
		id,
		words,
		startTime,
		endTime,
		isBG: background,
		isDuet: duet,
		isLineSynced: lineSynced,
		translatedLyric: "",
		romanLyric: "",
	};
}

/**
 * - `Syllable`: una línea por `Lead`, una palabra por sílaba (+ espacios).
 * - `Line` (y cualquier tipo desconocido, igual que el render clásico): una
 *   línea sincronizada por línea con una sola palabra.
 * - `Static`: no pasa por este renderizador → lista vacía.
 * Cada `Background` va como línea aparte `isBG`, justo tras su línea principal.
 * Las líneas sin palabras se descartan (así los huecos largos generan los
 * puntos de interludio en `buildSpicyLines`).
 */
export function fromSpicyBody(body: SpicyBody): LyricLine[] {
	if (body.Type === "Static") return [];
	const lineSynced = body.Type !== "Syllable";
	const lines: LyricLine[] = [];

	(body.Content ?? []).forEach((entry, index) => {
		if (!entry.Lead) return;
		const duet = !!entry.OppositeAligned;

		const main = makeLine(`l${index}`, entry.Lead, false, duet, lineSynced);
		if (main) lines.push(main);

		(entry.Background ?? []).forEach((background, bgIndex) => {
			const line = makeLine(`l${index}b${bgIndex}`, background, true, duet, lineSynced);
			if (line) lines.push(line);
		});
	});

	return lines;
}
