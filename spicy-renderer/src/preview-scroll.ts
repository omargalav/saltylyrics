/*
 * Derived from the AMLL TTML Tool; the renderer logic it implements
 * follows the Spicy Lyrics renderer (AGPL-3.0-or-later,
 * https://github.com/Spikerko/Spicy-Lyrics).
 *
 * Immediate origin: AMLL TTML Tool (NaeNae-AMLL-TTML-TOOL, AGPL-3.0),
 * src/modules/playback-clock/preview-scroll.ts
 * Ported to TypeScript + plain DOM for SaltyLyrics.
 * Changes: removed `reveal` (virtual-list support) and its two rAF retries; the rest is copied as is.
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
export interface PreviewScrollTarget {
	id: string;
	getNode: () => HTMLElement | null | undefined;
}

export function previewScrollTop(
	currentTop: number,
	relativeTop: number,
	lineHeight: number,
	viewportHeight: number,
	maxTop: number,
	anchor: number,
	offset: number,
) {
	return Math.max(
		0,
		Math.min(
			maxTop,
			currentTop +
				relativeTop +
				lineHeight / 2 -
				viewportHeight * anchor +
				offset,
		),
	);
}

/** Shared follow policy; only placement and manual-scroll grace differ by view. */
export function createPreviewScroll(
	viewport: HTMLElement,
	options: {
		getTarget: () => PreviewScrollTarget | undefined;
		anchor?: number;
		offset?: number;
		pauseMs?: number;
	},
) {
	let lastId: string | undefined;
	let pausedUntil = 0;
	let pointerDown = false;
	let resumeTimer: ReturnType<typeof setTimeout> | undefined;
	let scrollIdleTimer: ReturnType<typeof setTimeout> | undefined;
	let programmatic = false;
	let disposed = false;
	const markProgrammatic = () => {
		programmatic = true;
		clearTimeout(scrollIdleTimer);
		scrollIdleTimer = setTimeout(() => {
			programmatic = false;
		}, 100);
	};
	const jumpTo = (top: number) => {
		// scroll-behavior CSS can otherwise animate even an "auto" scroll.
		const behavior = viewport.style.scrollBehavior;
		viewport.style.scrollBehavior = "auto";
		viewport.scrollTo({ top, behavior: "auto" });
		viewport.style.scrollBehavior = behavior;
	};
	const center = (target: PreviewScrollTarget, seeked: boolean) => {
		const node = target.getNode();
		if (!node) return false;
		const rect = node.getBoundingClientRect();
		const viewportRect = viewport.getBoundingClientRect();
		const top = previewScrollTop(
			viewport.scrollTop,
			rect.top - viewportRect.top,
			rect.height,
			viewport.clientHeight,
			viewport.scrollHeight - viewport.clientHeight,
			options.anchor ?? 0.5,
			options.offset ?? 0,
		);
		markProgrammatic();
		if (seeked) jumpTo(top);
		else viewport.scrollTo({ top, behavior: "smooth" });
		lastId = target.id;
		return true;
	};
	const follow = (seeked = false) => {
		if (disposed || pointerDown) return;
		if (!seeked && performance.now() < pausedUntil) return;
		const target = options.getTarget();
		if (!target) {
			lastId = undefined;
			return;
		}
		if (!seeked && target.id === lastId) return;
		center(target, seeked);
	};
	const pause = () => {
		// Stop the native smooth scroll when the user takes control, just as
		// Timing Overview used to cancel its private scroll animation.
		if (programmatic) jumpTo(viewport.scrollTop);
		programmatic = false;
		clearTimeout(scrollIdleTimer);
		pausedUntil = performance.now() + (options.pauseMs ?? 750);
		clearTimeout(resumeTimer);
		resumeTimer = setTimeout(() => {
			// Retry the active target even if the song has paused in the meantime.
			lastId = undefined;
			follow();
		}, options.pauseMs ?? 750);
	};
	const onPointerDown = () => {
		pointerDown = true;
		pause();
	};
	const onPointerUp = () => {
		if (!pointerDown) return;
		pointerDown = false;
		pause();
	};
	const onScroll = () => {
		// Native smooth-scroll events keep this guard alive until scrolling
		// settles. Unsolicited scrolls (keyboard, scrollbar, accessibility)
		// get the same grace period as wheel/touch without a polling loop.
		if (programmatic) markProgrammatic();
		else pause();
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (
			[
				"ArrowUp",
				"ArrowDown",
				"PageUp",
				"PageDown",
				"Home",
				"End",
				" ",
			].includes(event.key)
		)
			pause();
	};
	viewport.addEventListener("wheel", pause, { passive: true });
	viewport.addEventListener("touchmove", pause, { passive: true });
	viewport.addEventListener("pointerdown", onPointerDown, { passive: true });
	viewport.addEventListener("scroll", onScroll, { passive: true });
	viewport.addEventListener("keydown", onKeyDown);
	window.addEventListener("pointerup", onPointerUp);
	window.addEventListener("pointercancel", onPointerUp);
	return {
		follow,
		dispose: () => {
			disposed = true;
			clearTimeout(resumeTimer);
			clearTimeout(scrollIdleTimer);
			viewport.removeEventListener("wheel", pause);
			viewport.removeEventListener("touchmove", pause);
			viewport.removeEventListener("pointerdown", onPointerDown);
			viewport.removeEventListener("scroll", onScroll);
			viewport.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
		},
	};
}
