/*
 * Tipos locales del port. Archivo nuevo (no existe en el TTML Tool).
 *
 * `LyricLine` / `LyricWord` sustituyen a `$/types/ttml` del TTML Tool
 * (AMLL TTML Tool, AGPL-3.0, https://github.com/Steve-xmh/amll-ttml-tool):
 * solo se declaran los campos que `model.ts` realmente lee, sin la dependencia
 * de `@applemusic-like-lyrics/lyric` ni de `uid`.
 *
 * Licencia del conjunto: AGPL-3.0-or-later (ver LICENSE).
 */

/** Palabra o sílaba en el modelo del renderizador. Tiempos en MILISEGUNDOS. */
export interface LyricWord {
	id: string;
	word: string;
	romanWord: string;
	startTime: number;
	endTime: number;
}

/** Línea en el modelo del renderizador. Tiempos en MILISEGUNDOS. */
export interface LyricLine {
	id: string;
	words: LyricWord[];
	startTime: number;
	endTime: number;
	isBG: boolean;
	isDuet: boolean;
	isLineSynced: boolean;
	translatedLyric: string;
	romanLyric: string;
}

/* ------------------------------------------------------------------ *
 * Contrato de datos de la API de Spicy Lyrics (`data.Body`).
 * Tiempos en SEGUNDOS. Se deduce de lo que `index.html` ya consume
 * (renderLyrics / sylsToWords); los campos opcionales son los que ese código
 * trata como opcionales.
 * ------------------------------------------------------------------ */

export interface SpicySyllable {
	Text: string;
	StartTime: number;
	EndTime: number;
	IsPartOfWord?: boolean;
}

export interface SpicyVocalGroup {
	StartTime: number;
	EndTime: number;
	Syllables?: SpicySyllable[];
	/** Texto plano, por si una respuesta "Line" no trae sílabas. */
	Text?: string;
}

export interface SpicyContentEntry {
	OppositeAligned?: boolean;
	Lead?: SpicyVocalGroup;
	Background?: SpicyVocalGroup[];
}

export interface SpicyBody {
	Type: "Syllable" | "Line" | "Static";
	Content?: SpicyContentEntry[];
}

/* ------------------------------------------------------------------ *
 * API pública (`window.SpicyRenderer`)
 * ------------------------------------------------------------------ */

export interface SpicyRendererOptions {
	/** Tiempo de la letra en ms (ya con el offset manual aplicado). */
	getTimeMs: () => number;
	isPlaying: () => boolean;
	/** Se llama con el tiempo de la letra (ms) al hacer clic en una línea. */
	onSeek?: (ms: number) => void;
	/** Fase 2: "Simple Lyrics mode". */
	simple?: boolean;
	/** Fase 2: mostrar todas las líneas como sincronizadas por línea. */
	forceLineSynced?: boolean;
	/** Fase 2: romanización. */
	romanized?: boolean;
	/** Fase 2: traducción. */
	showTranslation?: boolean;
}

export interface SpicyRendererInstance {
	/** Construye la letra. Devuelve cuántas líneas de letra (sin interludios) se pintaron. */
	render(body: SpicyBody): number;
	/** Avanza un frame. Sin argumento, lee `getTimeMs()`. */
	sync(tMs?: number): void;
	destroy(): void;
}
