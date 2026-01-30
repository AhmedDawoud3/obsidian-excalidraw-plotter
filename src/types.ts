import type { App } from "obsidian";

/**
 * Type definitions for Excalidraw plugin API
 * These types represent the external API provided by obsidian-excalidraw-plugin
 */

/**
 * Excalidraw element style properties
 */
export interface ExcalidrawStyle {
	strokeColor: string;
	strokeWidth: number;
	roughness: number;
	roundness: { type: number } | null;
	strokeStyle: "solid" | "dashed" | "dotted";
	fontSize: number;
	fontFamily: number;
	fillStyle: "solid" | "hachure" | "cross-hatch" | "dots";
	backgroundColor: string;
}

/**
 * Base Excalidraw element interface
 */
export interface ExcalidrawElement {
	id: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	roundness?: { type: number } | null;
	frameId?: string;
}

/**
 * Excalidraw Automate API interface
 * This is the public API exposed by obsidian-excalidraw-plugin
 */
export interface ExcalidrawAPI {
	style: ExcalidrawStyle;
	reset: () => void;
	setView: (view: string) => void;
	addLine: (points: [number, number][]) => string;
	addRect: (x: number, y: number, width: number, height: number) => string;
	addText: (x: number, y: number, text: string, options?: { textAlign?: string }) => string;
	addFrame: (x: number, y: number, width: number, height: number) => string;
	addElementsToView: (repositionToCursor?: boolean, save?: boolean) => Promise<void>;
	getElement: (id: string) => ExcalidrawElement | null;
	getViewElements: () => ExcalidrawElement[];
	deleteViewElements: (elements: ExcalidrawElement[]) => void;
	copyViewElementsToEAforEditing: (elements: ExcalidrawElement[]) => void;
}

/**
 * Extended App interface to access plugins
 */
export interface AppWithPlugins extends App {
	plugins?: {
		getPlugin: (id: string) => ExcalidrawPlugin | null;
	};
}

/**
 * Excalidraw plugin interface
 */
export interface ExcalidrawPlugin {
	ea?: ExcalidrawAPI;
	excalidrawAutomate?: ExcalidrawAPI;
}
