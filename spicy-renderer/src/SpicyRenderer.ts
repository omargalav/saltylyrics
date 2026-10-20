/*
 * Adapted from the Spicy Lyrics renderer (AGPL-3.0-or-later).
 * Original project: https://github.com/Spikerko/Spicy-Lyrics
 *
 * Immediate origin: AMLL TTML Tool (NaeNae-AMLL-TTML-TOOL, AGPL-3.0),
 * src/components/SpicyLyrics/useSpicyLyrics.ts (+ index.tsx for the root/viewport
 * structure). Ported to TypeScript + plain DOM for SaltyLyrics: the hook became
 * this class. The host owns the only animation loop and calls `sync()`.
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import { findSpicyScrollIndex } from "./active-line";
import {
	createSpicyAnimator,
	type SlmAnimation,
	type SpringSet,
} from "./createSpicyAnimator";
import { buildLines } from "./dom";
import { fromSpicyBody } from "./fromSpicyBody";
import type { Spring } from "./math";
import { buildSpicyLines, type SpicyLine } from "./model";
import { createPreviewScroll } from "./preview-scroll";
import type {
	SpicyBody,
	SpicyRendererInstance,
	SpicyRendererOptions,
} from "./types";

/** El tiempo salta hacia atrás más de esto entre dos frames → es un seek. */
const SEEK_BACKWARD_MS = 120;
/** El tiempo salta hacia delante más de esto entre dos frames → es un seek. */
const SEEK_FORWARD_MS = 1000;
/** Desplazamiento fijo del scroll (mismo valor que el TTML Tool). */
const SCROLL_OFFSET = 30;

type Animate = ReturnType<typeof createSpicyAnimator>;

export class SpicyLyricsRenderer implements SpicyRendererInstance {
	private readonly root: HTMLDivElement;
	private readonly viewport: HTMLDivElement;
	private readonly simple: boolean;
	private readonly forceLineSynced: boolean;
	private readonly romanized: boolean;
	private readonly showTranslation: boolean;

	private lines: SpicyLine[] = [];
	private lineNodes = new Map<string, HTMLDivElement>();
	private wordNodes = new Map<string, HTMLElement>();
	private springs = new Map<string, SpringSet>();
	private lineGlowSprings = new Map<string, Spring>();
	private slmAnimations = new Map<string, SlmAnimation>();
	private lastTime = { current: performance.now() };

	private animate: Animate | null = null;
	private scroll: ReturnType<typeof createPreviewScroll> | null = null;
	/** Tiempo (ms) del último frame procesado. */
	private lastT: number | null = null;
	private lastPlaying = false;
	/** Hay que repintar el siguiente frame aunque el tiempo no cambie. */
	private dirty = true;
	private currentT = 0;
	private destroyed = false;

	constructor(
		container: HTMLElement,
		private readonly options: SpicyRendererOptions,
	) {
		this.simple = !!options.simple;
		this.forceLineSynced = !!options.forceLineSynced;
		this.romanized = !!options.romanized;
		this.showTranslation = !!options.showTranslation;

		this.root = document.createElement("div");
		this.root.className = this.simple ? "spicy-root simple" : "spicy-root";
		this.viewport = document.createElement("div");
		this.viewport.className = "viewport";
		this.root.appendChild(this.viewport);
		container.appendChild(this.root);
	}

	render(body: SpicyBody): number {
		if (this.destroyed) return 0;
		this.resetState();

		this.lines = buildSpicyLines(
			fromSpicyBody(body),
			this.simple,
			this.romanized,
			this.forceLineSynced,
		);
		const lyricLines = this.lines.filter((line) => !line.isDotLine).length;

		this.viewport.replaceChildren(
			buildLines(
				{
					lineNodes: this.lineNodes,
					wordNodes: this.wordNodes,
					showTranslation: this.showTranslation,
					seek: (timeMs) => this.options.onSeek?.(timeMs),
				},
				this.lines,
			),
		);
		this.viewport.classList.toggle(
			"hasDuetLines",
			this.lines.some((line) => !line.isDotLine && line.isDuet),
		);
		this.jumpToTop();

		this.animate = createSpicyAnimator({
			lines: this.lines,
			simple: this.simple,
			lineNodes: this.lineNodes,
			wordNodes: this.wordNodes,
			springs: this.springs,
			lineGlowSprings: this.lineGlowSprings,
			slmAnimations: this.slmAnimations,
			lastTime: this.lastTime,
			isPlaying: this.options.isPlaying,
		});
		this.scroll = createPreviewScroll(this.viewport, {
			getTarget: () => {
				const index = findSpicyScrollIndex(this.lines, this.currentT);
				if (index < 0) return undefined;
				const line = this.lines[index];
				return { id: line.id, getNode: () => this.lineNodes.get(line.id) };
			},
			offset: SCROLL_OFFSET,
		});

		this.lastT = null;
		this.dirty = true;
		this.sync();
		return lyricLines;
	}

	sync(tMs?: number): void {
		if (this.destroyed || !this.animate) return;
		const t = tMs ?? this.options.getTimeMs();
		const now = performance.now();
		const playing = this.options.isPlaying();
		const previous = this.lastT;

		// En pausa y sin cambios no hay nada que animar.
		if (!this.dirty && !playing && playing === this.lastPlaying && t === previous) {
			this.lastTime.current = now;
			return;
		}

		const delta = previous === null ? 0 : t - previous;
		const seeked =
			this.dirty || delta < -SEEK_BACKWARD_MS || delta > SEEK_FORWARD_MS;

		this.dirty = false;
		this.lastT = t;
		this.lastPlaying = playing;
		this.currentT = t;
		this.animate(t / 1000, now, seeked);
		this.scroll?.follow(seeked);
	}

	destroy(): void {
		if (this.destroyed) return;
		this.resetState();
		this.destroyed = true;
		this.animate = null;
		this.root.remove();
	}

	/** Vacía y recrea los mapas y cancela lo que dependía de la letra anterior. */
	private resetState() {
		this.scroll?.dispose();
		this.scroll = null;
		// Al salir de una letra en modo simple, las animaciones Web Animations
		// de cada palabra deben cancelarse y su variable CSS limpiarse.
		for (const [key, state] of this.slmAnimations) {
			state.animation?.cancel();
			this.wordNodes.get(key)?.style.removeProperty("--spicy-slm-gradient-position");
		}
		this.lines = [];
		this.lineNodes = new Map();
		this.wordNodes = new Map();
		this.springs = new Map();
		this.lineGlowSprings = new Map();
		this.slmAnimations = new Map();
		this.animate = null;
		this.lastT = null;
		this.dirty = true;
	}

	private jumpToTop() {
		// El .viewport tiene scroll-behavior: smooth; para saltar de verdad hay
		// que anularlo (mismo truco que usa preview-scroll).
		const behavior = this.viewport.style.scrollBehavior;
		this.viewport.style.scrollBehavior = "auto";
		this.viewport.scrollTop = 0;
		this.viewport.style.scrollBehavior = behavior;
	}
}
