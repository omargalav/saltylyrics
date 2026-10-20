/*
 * Tests del adaptador. Archivo nuevo del port.
 *
 * ⚠️ Las fixtures son SINTÉTICAS: siguen el contrato que `index.html` ya
 * consume (Content[].Lead/Background/Syllables, tiempos en segundos), no son
 * respuestas reales de la API. Falta contrastarlas con respuestas reales.
 */
import { describe, expect, it } from "vitest";
import { fromSpicyBody } from "./fromSpicyBody";
import { buildSpicyLines, groupSpicyTokens, type SpicyLine } from "./model";
import type { SpicyBody, SpicySyllable } from "./types";

const syl = (Text: string, StartTime: number, EndTime: number, IsPartOfWord = false): SpicySyllable => ({
	Text,
	StartTime,
	EndTime,
	IsPartOfWord,
});

const body = (Type: SpicyBody["Type"], Content: SpicyBody["Content"]): SpicyBody => ({ Type, Content });

/** Texto que muestra el render nuevo para una línea de palabras. */
const spicyText = (line: SpicyLine) =>
	groupSpicyTokens(line.words)
		.map((group) => group.items.map(({ token }) => token.text).join(""))
		.join(" ");

/** Copia literal de `sylsToWords` + `joinText` de index.html (render clásico). */
function classicText(syllables: SpicySyllable[], bg = false) {
	const out: { text: string; joined: boolean }[] = [];
	for (const s of syllables) {
		let raw = String(s.Text ?? "");
		if (bg) raw = raw.replace(/[()]/g, "");
		const text = raw.trim();
		const prev = out[out.length - 1];
		if (prev && /^\s/.test(raw)) prev.joined = false;
		if (!text) {
			if (prev) prev.joined = false;
			continue;
		}
		out.push({ text, joined: !!s.IsPartOfWord && !/\s$/.test(raw) });
	}
	const groups: string[][] = [];
	let cur: string[] = [];
	for (const w of out) {
		cur.push(w.text);
		if (!w.joined) {
			groups.push(cur);
			cur = [];
		}
	}
	if (cur.length) groups.push(cur);
	return groups.map((g) => g.join("")).join(" ");
}

describe("fromSpicyBody — Syllable", () => {
	it("convierte segundos a ms e inserta un espacio tras cada sílaba no pegada", () => {
		const lines = fromSpicyBody(
			body("Syllable", [
				{
					OppositeAligned: true,
					Lead: {
						StartTime: 1.5,
						EndTime: 3,
						Syllables: [syl("Hel", 1.5, 2, true), syl("lo", 2, 2.5), syl("world", 2.5, 3)],
					},
				},
			]),
		);
		expect(lines).toHaveLength(1);
		const [line] = lines;
		expect(line.startTime).toBe(1500);
		expect(line.endTime).toBe(3000);
		expect(line.isDuet).toBe(true);
		expect(line.isLineSynced).toBe(false);
		expect(line.words.map((w) => w.word)).toEqual(["Hel", "lo", " ", "world", " "]);
		expect(line.words[0]).toMatchObject({ startTime: 1500, endTime: 2000 });
		expect(line.words[2]).toMatchObject({ startTime: 0, endTime: 0 });
	});

	it("produce el mismo texto que el render clásico, sin duplicar espacios", () => {
		const cases: SpicySyllable[][] = [
			[syl("Hel", 0, 1, true), syl("lo", 1, 2), syl("wor", 2, 3, true), syl("ld", 3, 4)],
			[syl("Hel", 0, 1, true), syl("lo ", 1, 2), syl("world", 2, 3)], // espacio al final
			[syl("a", 0, 1, true), syl(" b", 1, 2)], // espacio al principio de la siguiente
			[syl("one", 0, 1), syl(" ", 1, 1.2), syl("two", 1.2, 2)], // sílaba solo-espacio
			[syl("go", 0, 1), syl("", 1, 1.1), syl("on", 1.1, 2)], // sílaba vacía
		];
		for (const syllables of cases) {
			const content = [{ Lead: { StartTime: 0, EndTime: 5, Syllables: syllables } }];
			const [line] = buildSpicyLines(fromSpicyBody(body("Syllable", content)), false, false);
			expect(spicyText(line)).toBe(classicText(syllables));
		}
	});

	it("los coros van como línea aparte isBG justo después, sin paréntesis", () => {
		const lines = fromSpicyBody(
			body("Syllable", [
				{
					Lead: { StartTime: 0, EndTime: 2, Syllables: [syl("Main", 0, 2)] },
					Background: [
						{ StartTime: 1, EndTime: 2, Syllables: [syl("(ooh", 1, 1.5, true), syl("ah)", 1.5, 2)] },
					],
				},
				{ Lead: { StartTime: 3, EndTime: 4, Syllables: [syl("Next", 3, 4)] } },
			]),
		);
		expect(lines.map((l) => l.isBG)).toEqual([false, true, false]);
		const bg = buildSpicyLines(lines, false, false)[1];
		expect(bg.isBackground).toBe(true);
		expect(bg.startTime).toBe(1000);
		expect(spicyText(bg)).toBe("oohah");
	});

	it("descarta líneas sin palabras y deja que el hueco genere los puntos de interludio", () => {
		const lines = fromSpicyBody(
			body("Syllable", [
				{ Lead: { StartTime: 0, EndTime: 2, Syllables: [syl("Uno", 0, 2)] } },
				{ Lead: { StartTime: 2, EndTime: 6, Syllables: [syl("  ", 2, 6)] } }, // vacía
				{ Lead: { StartTime: 8, EndTime: 9, Syllables: [syl("Dos", 8, 9)] } },
			]),
		);
		expect(lines).toHaveLength(2);
		const built = buildSpicyLines(lines, false, false);
		expect(built.filter((l) => l.isDotLine)).toHaveLength(1);
		expect(built.find((l) => l.isDotLine)).toMatchObject({ startTime: 2000, endTime: 8000 });
	});

	it("añade los puntos iniciales si la primera línea empieza en ≥ 3 s", () => {
		const built = buildSpicyLines(
			fromSpicyBody(body("Syllable", [{ Lead: { StartTime: 5, EndTime: 6, Syllables: [syl("Hi", 5, 6)] } }])),
			false,
			false,
		);
		expect(built[0]).toMatchObject({ isDotLine: true, startTime: 0, endTime: 5000 });
	});

	it("el modelo descarta sílabas de duración cero (comportamiento heredado del Tool)", () => {
		const built = buildSpicyLines(
			fromSpicyBody(
				body("Syllable", [
					{ Lead: { StartTime: 0, EndTime: 2, Syllables: [syl("ok", 0, 1), syl("lost", 1, 1)] } },
				]),
			),
			false,
			false,
		);
		expect(built[0].words.map((w) => w.text)).toEqual(["ok"]);
	});
});

describe("fromSpicyBody — Line y Static", () => {
	it("Line: una línea sincronizada por línea con una única palabra", () => {
		const lines = fromSpicyBody(
			body("Line", [{ Lead: { StartTime: 1, EndTime: 4, Syllables: [syl("Una línea entera", 1, 4)] } }]),
		);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({ isLineSynced: true, startTime: 1000, endTime: 4000 });
		expect(lines[0].words).toHaveLength(1);
		expect(lines[0].words[0]).toMatchObject({ word: "Una línea entera", startTime: 1000, endTime: 4000 });
		const [built] = buildSpicyLines(lines, false, false);
		expect(built.isLineSynced).toBe(true);
		expect(built.text).toBe("Una línea entera");
	});

	it("Line: acepta también Lead.Text si no hay sílabas", () => {
		const lines = fromSpicyBody(body("Line", [{ Lead: { StartTime: 0, EndTime: 2, Text: "Solo texto" } }]));
		expect(lines[0].words[0].word).toBe("Solo texto");
	});

	it("Static no pasa por el renderizador", () => {
		expect(
			fromSpicyBody(body("Static", [{ Lead: { StartTime: 0, EndTime: 1, Syllables: [syl("x", 0, 1)] } }])),
		).toEqual([]);
	});

	it("un cuerpo vacío o sin Content da una lista vacía", () => {
		expect(fromSpicyBody({ Type: "Syllable" })).toEqual([]);
		expect(fromSpicyBody(body("Syllable", []))).toEqual([]);
	});
});
