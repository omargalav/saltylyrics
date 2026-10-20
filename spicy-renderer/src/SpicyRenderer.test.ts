// @vitest-environment jsdom
/*
 * Tests de la clase principal contra jsdom. Archivo nuevo del port
 * (sustituye a `playback.test.tsx` del TTML Tool, que era de React).
 * Fixtures sintéticas (ver fromSpicyBody.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "./index";
import type { SpicyBody, SpicySyllable } from "./types";

const syl = (Text: string, StartTime: number, EndTime: number, IsPartOfWord = false): SpicySyllable => ({
	Text,
	StartTime,
	EndTime,
	IsPartOfWord,
});

const BODY: SpicyBody = {
	Type: "Syllable",
	Content: [
		// Sílabas cortas (< 1 s) → palabras normales; "Long" (2,5 s) → letra por letra.
		{ Lead: { StartTime: 0, EndTime: 2, Syllables: [syl("Hel", 0, 0.8, true), syl("lo", 0.8, 1.6)] } },
		{
			OppositeAligned: true,
			Lead: { StartTime: 2, EndTime: 6, Syllables: [syl("Long", 2, 4.5)] },
			Background: [{ StartTime: 3, EndTime: 3.8, Syllables: [syl("(back)", 3, 3.8)] }],
		},
		{ Lead: { StartTime: 10, EndTime: 12, Syllables: [syl("Late", 10, 10.8)] } },
	],
};

let container: HTMLElement;
let time = 0;
let playing = true;

beforeEach(() => {
	time = 0;
	playing = true;
	container = document.createElement("div");
	document.body.appendChild(container);
	// jsdom no implementa scrollTo en elementos.
	Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});
afterEach(() => {
	container.remove();
	vi.restoreAllMocks();
});

const make = (onSeek?: (ms: number) => void) =>
	create(container, { getTimeMs: () => time, isPlaying: () => playing, onSeek });

describe("SpicyRenderer", () => {
	it("crea su raíz dentro del contenedor y pinta líneas, palabras y letras", () => {
		const r = make();
		expect(container.querySelector(".spicy-root > .viewport")).not.toBeNull();
		const count = r.render(BODY);
		expect(count).toBe(4); // 3 líneas + 1 coro; los interludios no cuentan
		const lines = container.querySelectorAll(".line");
		// puntos de interludio entre 6 s y 10 s
		expect(container.querySelectorAll(".line.dotLine")).toHaveLength(1);
		expect(lines.length).toBe(5);
		expect(container.querySelector(".line.backgroundLine")?.textContent).toBe("back");
		expect(container.querySelector(".line.duet")).not.toBeNull();
		// Orden: línea, línea, coro, interludio, línea
		expect(
			[...lines].map((l) => (l.classList.contains("dotLine") ? "dots" : l.classList.contains("backgroundLine") ? "bg" : "line")),
		).toEqual(["line", "line", "bg", "dots", "line"]);
		// "Hel"+"lo" → un grupo de palabra con dos sílabas
		expect(container.querySelectorAll(".wordGroup .word")).toHaveLength(2);
		// "Long" dura 2,5 s → letra por letra
		expect(container.querySelectorAll(".letterGroup .letter")).toHaveLength(4);
		expect(container.querySelectorAll(".dot")).toHaveLength(3);
		expect(container.querySelector(".viewport")?.classList.contains("hasDuetLines")).toBe(true);
		r.destroy();
	});

	it("sync marca data-state y rellena el gradiente de la palabra activa", () => {
		const r = make();
		r.render(BODY);
		time = 500;
		r.sync();
		const first = container.querySelectorAll<HTMLElement>(".line")[0];
		expect(first.dataset.state).toBe("active");
		const hel = first.querySelector<HTMLElement>(".word");
		expect(hel?.style.getPropertyValue("--gradient-position")).not.toBe("");
		expect(container.querySelectorAll<HTMLElement>(".line")[1].dataset.state).toBe("not-sung");
		time = 7000; // dentro del hueco: los puntos están activos
		r.sync();
		expect(first.dataset.state).toBe("sung");
		expect(container.querySelector<HTMLElement>(".line.dotLine")?.dataset.state).toBe("active");
		r.destroy();
	});

	it("aplica --blur según la distancia a la línea activa", () => {
		const r = make();
		r.render(BODY);
		time = 500;
		r.sync();
		const lines = container.querySelectorAll<HTMLElement>(".line");
		expect(lines[0].style.getPropertyValue("--blur")).toBe("0px");
		expect(lines[1].style.getPropertyValue("--blur")).toBe("1.25px");
		r.destroy();
	});

	it("el clic en una línea llama a onSeek con su inicio en ms", () => {
		const onSeek = vi.fn();
		const r = make(onSeek);
		r.render(BODY);
		container.querySelectorAll<HTMLElement>(".line")[1].click(); // "Long"
		expect(onSeek).toHaveBeenCalledWith(2000);
		r.destroy();
	});

	it("render() vuelve a construir: no acumula nodos de la letra anterior", () => {
		const r = make();
		r.render(BODY);
		r.render({ Type: "Syllable", Content: [{ Lead: { StartTime: 0, EndTime: 1, Syllables: [syl("Solo", 0, 1)] } }] });
		expect(container.querySelectorAll(".line")).toHaveLength(1);
		expect(container.querySelectorAll(".spicy-root")).toHaveLength(1);
		r.destroy();
	});

	it("Static y cuerpos vacíos devuelven 0 líneas", () => {
		const r = make();
		expect(r.render({ Type: "Static", Content: BODY.Content })).toBe(0);
		expect(r.render({ Type: "Syllable", Content: [] })).toBe(0);
		r.destroy();
	});

	it("Line: pinta la línea como texto con la clase lineSynced", () => {
		const r = make();
		r.render({ Type: "Line", Content: [{ Lead: { StartTime: 0, EndTime: 3, Syllables: [syl("Toda la línea", 0, 3)] } }] });
		const line = container.querySelector<HTMLElement>(".line.lineSynced");
		expect(line?.textContent).toBe("Toda la línea");
		time = 1500;
		r.sync();
		expect(line?.style.getPropertyValue("--line-gradient-position")).toBe("50%");
		r.destroy();
	});

	it("destroy() quita la raíz y sync()/render() posteriores no hacen nada", () => {
		const r = make();
		r.render(BODY);
		r.destroy();
		expect(container.querySelector(".spicy-root")).toBeNull();
		expect(() => r.sync()).not.toThrow();
		expect(r.render(BODY)).toBe(0);
		expect(container.querySelector(".spicy-root")).toBeNull();
	});

	it("un salto de más de 1 s cuenta como seek: los springs saltan al objetivo sin animar", () => {
		const r = make();
		r.render(BODY);
		time = 500;
		r.sync();
		time = 11_000; // salto de 10,5 s hacia delante: "Late" ya está cantada
		r.sync();
		const late = container.querySelectorAll<HTMLElement>(".line")[4];
		expect(late.dataset.state).toBe("active");
		// Con snap el spring queda exactamente en su valor final (escala 1);
		// sin snap arrancaría en 0.95 y tardaría varios frames en llegar.
		expect(Number(late.querySelector<HTMLElement>(".word")?.style.scale)).toBeCloseTo(1, 6);
		r.destroy();
	});

	it("en pausa y sin cambios no repite el trabajo del frame", () => {
		playing = false;
		const r = make();
		r.render(BODY);
		time = 500;
		r.sync();
		const first = container.querySelectorAll<HTMLElement>(".line")[0];
		first.dataset.state = "tocado-a-mano";
		r.sync(); // mismo tiempo, mismo estado de reproducción: se omite
		expect(first.dataset.state).toBe("tocado-a-mano");
		time = 600;
		r.sync();
		expect(first.dataset.state).toBe("active");
		r.destroy();
	});
});
