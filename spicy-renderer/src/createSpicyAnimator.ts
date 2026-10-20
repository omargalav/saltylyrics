/*
 * Adapted from the Spicy Lyrics renderer (AGPL-3.0-or-later).
 * Original project: https://github.com/Spikerko/Spicy-Lyrics
 *
 * Immediate origin: AMLL TTML Tool (NaeNae-AMLL-TTML-TOOL, AGPL-3.0),
 * src/components/SpicyLyrics/createSpicyAnimator.ts
 * Ported to TypeScript + plain DOM for SaltyLyrics.
 * Changes: component refs → plain Maps; FPS counter removed; playback state comes from isPlaying().
 * Licensed AGPL-3.0-or-later (see LICENSE).
 */
import { findSpicyActiveIndex } from "./active-line";
import { lineGlowSpline } from "./animation-curves";
import { progressAt, Spring, stateAt } from "./math";
import type { SpicyLine, SpicyToken } from "./model";
import { keyFor } from "./model";
import { createTokenAnimator } from "./token-animation";
export type SpringSet = {
	scale: Spring;
	y: Spring;
	glow: Spring;
	opacity: Spring;
};
export type SlmAnimation = {
	animation?: Animation;
	phase: "idle" | "pre" | "fill" | "sung";
};

interface AnimationContext {
	lines: SpicyLine[];
	simple: boolean;
	lineNodes: Map<string, HTMLDivElement>;
	wordNodes: Map<string, HTMLElement>;
	springs: Map<string, SpringSet>;
	lineGlowSprings: Map<string, Spring>;
	slmAnimations: Map<string, SlmAnimation>;
	lastTime: { current: number };
	/** ¿Está sonando? Con false los springs saltan al objetivo (snap). */
	isPlaying: () => boolean;
}
export function createSpicyAnimator({
	lines,
	simple,
	lineNodes,
	wordNodes,
	springs,
	lineGlowSprings,
	slmAnimations,
	lastTime,
	isPlaying,
}: AnimationContext) {
	const animate = (seconds: number, now: number, seeked = false) => {
		const snap = seeked || !isPlaying();
		const dt = (now - lastTime.current) / 1000;
		lastTime.current = now;
		const time = seconds * 1000;
		const activeIndex = findSpicyActiveIndex(lines, time);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const status = stateAt(time, line.startTime, line.endTime);
			const node = lineNodes.get(line.id);
			if (node) {
				node.dataset.state = status;
				node.dataset.prehidden = String(
					!!line.isDotLine &&
						(status === "not-sung" || time > line.endTime - 500),
				);
				const blur =
					status === "active"
						? 0
						: Math.min(Math.abs(i - activeIndex) * 1.25, 6.8);
				node.style.setProperty("--blur", `${blur}px`);
				if (line.isLineSynced && !line.isDotLine) {
					const lineProgress =
						status === "active"
							? progressAt(time, line.startTime, line.endTime)
							: status === "sung"
								? 1
								: 0;
					if (simple) {
						// The normal line renderer writes this variable inline. Pin it here
						// as well, otherwise switching into SLM leaves a stale mid-sweep
						// normal-mode value that the SLM stylesheet cannot override.
						node.style.setProperty("--line-gradient-position", "100%");
						node.style.setProperty("--line-shadow-alpha", "0");
					} else {
						let glow = lineGlowSprings.get(line.id);
						if (!glow) {
							glow = new Spring(0, 1, 0.5);
							lineGlowSprings.set(line.id, glow);
						}
						glow.setGoal(lineGlowSpline.at(lineProgress), snap);
						const currentGlow = glow.step(dt);
						node.style.setProperty(
							"--line-shadow-blur",
							`${4 + 8 * currentGlow}px`,
						);
						node.style.setProperty(
							"--line-shadow-alpha",
							String(currentGlow * 0.5),
						);
						node.style.setProperty(
							"--line-gradient-position",
							`${status === "active" ? lineProgress * 100 : status === "sung" ? 100 : -20}%`,
						);
					}
				}
			}
		}
		for (const line of lines)
			if (line.isLineSynced && !line.isDotLine) continue;
			else
				for (let wi = 0; wi < line.words.length; wi++) {
					const word = line.words[wi];
					const rootKey = keyFor(line, word, wi);
					// Spicy's TimeSetter cascades the line state to every child when
					// the line itself is not active. This matters for adjusted held-word
					// timings near a line boundary.
					const wordState =
						stateAt(time, line.startTime, line.endTime) === "active"
							? stateAt(time, word.startTime, word.endTime)
							: stateAt(time, line.startTime, line.endTime);
					const progress =
						wordState === "active"
							? progressAt(time, word.startTime, word.endTime)
							: wordState === "sung"
								? 1
								: 0;
					const slmStateFor = (nodeKey: string) => {
						let result = slmAnimations.get(nodeKey);
						if (!result) {
							result = { phase: "idle" };
							slmAnimations.set(nodeKey, result);
						}
						return result;
					};
					const pinSlmGradient = (
						nodeKey: string,
						node: HTMLElement | undefined,
						position: "-50%" | "100%",
					) => {
						if (!node) return;
						const animation = slmStateFor(nodeKey);
						const phase = position === "100%" ? "sung" : "idle";
						if (animation.phase === phase) return;
						animation.animation?.cancel();
						animation.animation = undefined;
						animation.phase = phase;
						node.style.setProperty("--spicy-slm-gradient-position", position);
					};
					const runSlmAnimation = (
						nodeKey: string,
						node: HTMLElement | undefined,
						phase: "pre" | "fill",
						duration: number,
						elapsed: number,
					) => {
						if (!node || !simple) return;
						const animation = slmStateFor(nodeKey);
						if (animation.phase !== phase || !animation.animation) {
							animation.animation?.cancel();
							node.style.removeProperty("--spicy-slm-gradient-position");
							animation.phase = phase;
							animation.animation = node.animate(
								phase === "fill"
									? [
											{ "--spicy-slm-gradient-position": "-27.5%" },
											{ "--spicy-slm-gradient-position": "100%" },
										]
									: [
											{ "--spicy-slm-gradient-position": "-50%" },
											{ "--spicy-slm-gradient-position": "-27.5%" },
										],
								{
									duration: Math.max(0, duration),
									easing: "linear",
									fill: "forwards",
								},
							);
						}
						animation.animation?.pause();
						if (animation.animation)
							animation.animation.currentTime = Math.max(
								0,
								Math.min(duration, elapsed),
							);
					};
					const prefillToken = (
						next: SpicyToken | undefined,
						nextIndex: number,
					) => {
						if (
							!next ||
							stateAt(time, next.startTime, next.endTime) !== "not-sung"
						)
							return;
						const nextKey = keyFor(line, next, nextIndex);
						if (next.letters) {
							for (let index = 0; index < next.letters.length; index++) {
								const letterStart =
									next.startTime +
									index *
										((next.endTime - next.startTime) / next.letters.length);
								runSlmAnimation(
									`${nextKey}:${letterStart}`,
									wordNodes.get(`${nextKey}:${letterStart}`),
									"pre",
									125,
									125 - (letterStart - time),
								);
							}
						} else
							runSlmAnimation(
								nextKey,
								wordNodes.get(nextKey),
								"pre",
								125,
								125 - (next.startTime - time),
							);
					};
					const { animateNode, animateHeldGroup, animateHeldLetters } =
						createTokenAnimator({
							springs,
							wordNodes,
							word,
							wordState,
							simple,
							snap,
							dt,
							time,
							prefillNext: () => prefillToken(line.words[wi + 1], wi + 1),
							runSlmAnimation,
							pinSlmGradient,
						});
					if (line.isDotLine)
						animateNode(
							rootKey,
							wordNodes.get(rootKey),
							progress,
							true,
						);
					else if (word.letters) {
						animateHeldGroup(rootKey, wordNodes.get(rootKey), progress);
						animateHeldLetters(word, rootKey, wordState);
					} else animateNode(rootKey, wordNodes.get(rootKey), progress);
				}
	};
	return animate;
}
