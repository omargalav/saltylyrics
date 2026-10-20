/*
 * Punto de entrada del bundle. Expone `window.SpicyRenderer.create(...)`.
 * Archivo nuevo del port. Licensed AGPL-3.0-or-later (see LICENSE).
 */
import "./style.css";
import { SpicyLyricsRenderer } from "./SpicyRenderer";
import type { SpicyRendererInstance, SpicyRendererOptions } from "./types";

export type {
	SpicyBody,
	SpicyContentEntry,
	SpicyRendererInstance,
	SpicyRendererOptions,
	SpicySyllable,
	SpicyVocalGroup,
} from "./types";

/** Monta el renderizador dentro de `container` (crea su propia raíz `.spicy-root`). */
export function create(
	container: HTMLElement,
	options: SpicyRendererOptions,
): SpicyRendererInstance {
	return new SpicyLyricsRenderer(container, options);
}
