/*
 * Adapted from the Spicy Lyrics renderer (AGPL-3.0-or-later).
 * Original project: https://github.com/Spikerko/Spicy-Lyrics
 *
 * Immediate origin: AMLL TTML Tool (NaeNae-AMLL-TTML-TOOL, AGPL-3.0),
 * src/components/SpicyLyrics/SpicyLyricLines.tsx
 * Ported to TypeScript + plain DOM for SaltyLyrics: the JSX that described
 * the DOM structure is now functions that create the same elements.
 * Structure kept 1:1 with the original:
 *   .line (dotLine | lineSynced | rtl | backgroundLine | duet)
 *     > .wordGroup > .word | .letterGroup > .letter
 *     > .dotGroup > .dot
 *     > .translation
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import {
	groupSpicyTokens,
	isRtl,
	keyFor,
	type SpicyLine,
	type SpicyToken,
} from "./model";

export interface DomContext {
	/** Se rellenan al construir: id de línea → nodo. */
	lineNodes: Map<string, HTMLDivElement>;
	/** Se rellenan al construir: `keyFor(...)` (y `key:inicioLetra`) → nodo. */
	wordNodes: Map<string, HTMLElement>;
	showTranslation: boolean;
	/** Clic en una línea → tiempo de inicio de la línea (ms). */
	seek: (timeMs: number) => void;
}

type ClassPart = string | false | undefined | null;
const cx = (...parts: ClassPart[]) => parts.filter(Boolean).join(" ");

function span(className: string, text?: string): HTMLSpanElement {
	const node = document.createElement("span");
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function renderToken(
	context: DomContext,
	line: SpicyLine,
	word: SpicyToken,
	wordIndex: number,
	wordBoundary: boolean,
): HTMLSpanElement {
	const key = keyFor(line, word, wordIndex);
	const letters = word.letters;
	const node = span(
		cx(
			letters ? "letterGroup" : "word",
			wordBoundary && "wordBoundary",
			word.allowInternalWrap && "breakableToken",
		),
	);
	if (isRtl(word.text)) node.dir = "rtl";
	context.wordNodes.set(key, node);

	if (!letters) {
		node.textContent = word.text;
		return node;
	}
	letters.forEach((letter, index) => {
		const start =
			word.startTime + index * ((word.endTime - word.startTime) / letters.length);
		const letterNode = span("letter", letter);
		context.wordNodes.set(`${key}:${start}`, letterNode);
		node.appendChild(letterNode);
	});
	return node;
}

function renderLine(context: DomContext, line: SpicyLine): HTMLDivElement {
	const node = document.createElement("div");
	node.className = cx(
		"line",
		line.isDotLine && "dotLine",
		line.isLineSynced && "lineSynced",
		line.isRtl && "rtl",
		line.isBackground && "backgroundLine",
		line.isDuet && "duet",
	);
	if (line.isRtl) node.dir = "rtl";
	node.addEventListener("click", () => context.seek(line.startTime));
	context.lineNodes.set(line.id, node);

	if (line.isDotLine) {
		const group = document.createElement("div");
		group.className = "dotGroup";
		line.words.forEach((word, index) => {
			const dot = span("dot", word.text);
			context.wordNodes.set(keyFor(line, word, index), dot);
			group.appendChild(dot);
		});
		node.appendChild(group);
	} else if (line.isLineSynced) {
		node.appendChild(document.createTextNode(line.text ?? ""));
	} else {
		for (const group of groupSpicyTokens(line.words)) {
			const first = group.items[0];
			if (group.items.length === 1) {
				node.appendChild(
					renderToken(context, line, first.token, first.wordIndex, group.hasTrailingSpace),
				);
				continue;
			}
			const wrapper = span(cx("wordGroup", group.hasTrailingSpace && "wordBoundary"));
			for (const { token, wordIndex } of group.items)
				wrapper.appendChild(renderToken(context, line, token, wordIndex, false));
			node.appendChild(wrapper);
		}
	}

	if (context.showTranslation && !line.isDotLine && line.translation)
		node.appendChild(span("translation", line.translation));
	return node;
}

/** Construye todas las líneas y registra sus nodos en `context`. */
export function buildLines(context: DomContext, lines: SpicyLine[]): DocumentFragment {
	const fragment = document.createDocumentFragment();
	for (const line of lines) fragment.appendChild(renderLine(context, line));
	return fragment;
}
