// @vitest-environment jsdom
/*
 * Derived from the AMLL TTML Tool (AGPL-3.0); the renderer logic under test
 * follows the Spicy Lyrics renderer (AGPL-3.0-or-later,
 * https://github.com/Spikerko/Spicy-Lyrics).
 *
 * Immediate origin: src/modules/playback-clock/preview-scroll.test.ts
 * Changes: removed the virtual-list `reveal` test.
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPreviewScroll, previewScrollTop } from "./preview-scroll";

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function setup(pauseMs = 750) {
	vi.useFakeTimers();
	vi.spyOn(performance, "now").mockImplementation(() => Date.now());
	const viewport = document.createElement("div");
	const node = document.createElement("div");
	Object.defineProperties(viewport, {
		clientHeight: { value: 400 },
		scrollHeight: { value: 2000 },
	});
	vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
		new DOMRect(0, 100, 500, 400),
	);
	vi.spyOn(node, "getBoundingClientRect").mockReturnValue(
		new DOMRect(0, 700, 400, 80),
	);
	viewport.scrollTo = vi.fn();
	let id: string | undefined = "a";
	const getTarget = () => (id ? { id, getNode: () => node } : undefined);
	const scroll = createPreviewScroll(viewport, { getTarget, pauseMs });
	return {
		viewport,
		node,
		scroll,
		setId: (next?: string) => {
			id = next;
		},
	};
}

describe("shared preview scroll", () => {
	it("retains each renderer's placement and clamps both ends", () => {
		expect(previewScrollTop(100, 600, 80, 400, 1600, 0.4, 0)).toBe(580);
		expect(previewScrollTop(100, 600, 80, 400, 1600, 0.5, 30)).toBe(570);
		expect(previewScrollTop(100, 600, 80, 400, 1600, 0.5, 0)).toBe(540);
		expect(previewScrollTop(0, -100, 80, 400, 1600, 0.5, 0)).toBe(0);
		expect(previewScrollTop(1000, 900, 80, 400, 1600, 0.5, 0)).toBe(1600);
	});

	it("follows an offscreen target once and recenters the same line on seek", () => {
		const { viewport, scroll } = setup();
		scroll.follow();
		expect(viewport.scrollTo).toHaveBeenLastCalledWith({
			top: 440,
			behavior: "smooth",
		});
		scroll.follow();
		expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
		scroll.follow(true);
		expect(viewport.scrollTo).toHaveBeenLastCalledWith({
			top: 440,
			behavior: "auto",
		});
		scroll.dispose();
	});

	it("resumes after manual scrolling even without another playback frame", () => {
		const { viewport, scroll, setId } = setup();
		scroll.follow();
		viewport.dispatchEvent(new Event("wheel"));
		// One immediate scroll cancels the in-flight native smooth scroll.
		expect(viewport.scrollTo).toHaveBeenLastCalledWith({
			top: 0,
			behavior: "auto",
		});
		setId("b");
		scroll.follow();
		expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(750);
		expect(viewport.scrollTo).toHaveBeenCalledTimes(3);
		scroll.dispose();
	});

	it("distinguishes native auto-scroll events from manual scrollbar scrolling", () => {
		const { viewport, scroll, setId } = setup();
		scroll.follow();
		viewport.dispatchEvent(new Event("scroll"));
		setId("b");
		scroll.follow();
		expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(100);
		viewport.dispatchEvent(new Event("scroll"));
		setId("c");
		scroll.follow();
		expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(750);
		expect(viewport.scrollTo).toHaveBeenCalledTimes(3);
		scroll.dispose();
	});

	it("lets paused seeks override the manual-scroll grace period", () => {
		const { viewport, scroll } = setup();
		viewport.dispatchEvent(new Event("wheel"));
		scroll.follow();
		expect(viewport.scrollTo).not.toHaveBeenCalled();
		scroll.follow(true);
		expect(viewport.scrollTo).toHaveBeenLastCalledWith({
			top: 440,
			behavior: "auto",
		});
		scroll.dispose();
	});

	it("keeps Timing Overview's longer grace period as an explicit option", () => {
		const { viewport, scroll } = setup(3500);
		viewport.dispatchEvent(new Event("touchmove"));
		vi.advanceTimersByTime(750);
		expect(viewport.scrollTo).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2750);
		expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
		scroll.dispose();
	});

	it("does not fight a held pointer and cancels pending work on unmount", () => {
		const { viewport, scroll } = setup();
		viewport.dispatchEvent(new Event("pointerdown"));
		vi.advanceTimersByTime(1000);
		scroll.follow(true);
		expect(viewport.scrollTo).not.toHaveBeenCalled();
		window.dispatchEvent(new Event("pointerup"));
		scroll.dispose();
		vi.advanceTimersByTime(1000);
		expect(viewport.scrollTo).not.toHaveBeenCalled();
	});

	it("re-follows a line after a gap", () => {
		const { viewport, scroll, setId } = setup();
		scroll.follow();
		setId();
		scroll.follow();
		setId("a");
		scroll.follow();
		expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
		scroll.dispose();
	});

});
