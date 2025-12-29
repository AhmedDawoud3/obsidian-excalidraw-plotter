import { App, Notice } from "obsidian";
import { Point, PointSegment, MathEngine } from "./math-engine";

export interface DrawingOptions {
	strokeColor: string;
	strokeWidth: number;
	drawAxes: boolean;
	axisColor: string;
	showTickMarks: boolean;
	xTickInterval: number;
	yTickInterval: number;
	showNumbers: boolean;
	drawBorder: boolean;
	borderColor: string;
	customXTicks: number[];
	customYTicks: number[];
	showGrid: boolean;
	gridColor: string;
	showArrows: boolean;
	useRoundEdges: boolean;
	forceShowXAxis: boolean;
	forceShowYAxis: boolean;
}

export interface DrawnElements {
	elementIds: string[];
	ea: ReturnType<typeof getExcalidrawAPI>;
}

const DEFAULT_DRAWING_OPTIONS: DrawingOptions = {
	strokeColor: "#1e1e1e",
	strokeWidth: 2,
	drawAxes: true,
	axisColor: "#cccccc",
	showTickMarks: true,
	xTickInterval: 1,
	yTickInterval: 1,
	showNumbers: true,
	drawBorder: false,
	borderColor: "#888888",
	customXTicks: [],
	customYTicks: [],
	showGrid: false,
	gridColor: "#e8e8e8",
	showArrows: true,
	useRoundEdges: true,
	forceShowXAxis: false,
	forceShowYAxis: false,
};

/**
 * Get the Excalidraw Automate API from the Excalidraw plugin
 * @param app - The Obsidian App instance
 * @returns The EA API or null if not available
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getExcalidrawAPI(app: App): any | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const excalidrawPlugin = (app as any).plugins?.getPlugin(
		"obsidian-excalidraw-plugin"
	);
	if (!excalidrawPlugin) {
		return null;
	}
	// Get the EA API and set the active view
	const ea = excalidrawPlugin.ea;
	if (ea) {
		// Set the target view to the currently active Excalidraw view
		// Must use "active" string, not the view object directly
		ea.setView("active");
	}
	return ea;
}

/**
 * Delete elements from the Excalidraw view by their IDs
 */
export function deleteElements(app: App, elementIds: string[]): boolean {
	const ea = getExcalidrawAPI(app);
	if (!ea || !elementIds.length) return false;
	
	try {
		const viewElements = ea.getViewElements();
		const elementsToDelete = viewElements.filter(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(el: any) => elementIds.includes(el.id)
		);
		if (elementsToDelete.length > 0) {
			ea.deleteViewElements(elementsToDelete);
		}
		return true;
	} catch {
		return false;
	}
}

/**
 * Convert math coordinates to screen coordinates
 * Math: Y increases upward, origin at center
 * Screen: Y increases downward, origin at top-left
 * 
 * @param point - The point in math coordinates
 * @param xScale - Pixels per unit for X axis
 * @param yScale - Pixels per unit for Y axis
 * @returns The point as [screenX, screenY] array
 */
function toScreenCoordinates(point: Point, xScale: number, yScale: number): [number, number] {
	const screenX = point.x * xScale;
	const screenY = -1 * (point.y * yScale); // Invert Y axis
	return [screenX, screenY];
}

/**
 * Draw a mathematical function graph onto the active Excalidraw canvas
 * 
 * @param app - The Obsidian App instance
 * @param points - Array of {x, y} points from the math engine
 * @param xScale - Pixels per unit for X axis
 * @param yScale - Pixels per unit for Y axis (optional, defaults to xScale)
 * @param options - Optional drawing configuration
 * @returns Array of element IDs if drawing succeeded, null otherwise
 */
export async function drawGraph(
	app: App,
	points: Point[],
	xScale: number,
	yScale?: number,
	options: Partial<DrawingOptions> = {}
): Promise<string[] | null> {
	// Wrap single point array in a segment and call the segments version
	return drawGraphSegments(app, [{ points }], xScale, yScale, options);
}

/**
 * Draw a mathematical function graph with multiple segments (for discontinuous functions)
 * 
 * @param app - The Obsidian App instance
 * @param segments - Array of point segments (each segment is a continuous curve)
 * @param xScale - Pixels per unit for X axis
 * @param yScaleOrOptions - Pixels per unit for Y axis, or options if yScale equals xScale
 * @param options - Optional drawing configuration
 * @returns Array of element IDs if drawing succeeded, null otherwise
 */
export async function drawGraphSegments(
	app: App,
	segments: PointSegment[],
	xScale: number,
	yScaleOrOptions?: number | Partial<DrawingOptions>,
	options: Partial<DrawingOptions> = {}
): Promise<string[] | null> {
	// Handle overloaded parameters
	let yScale: number;
	let opts: DrawingOptions;
	if (typeof yScaleOrOptions === 'number') {
		yScale = yScaleOrOptions;
		opts = { ...DEFAULT_DRAWING_OPTIONS, ...options };
	} else {
		yScale = xScale; // Default yScale to xScale if not provided
		opts = { ...DEFAULT_DRAWING_OPTIONS, ...(yScaleOrOptions || {}) };
	}

	// Get the Excalidraw API
	const ea = getExcalidrawAPI(app);
	if (!ea) {
		new Notice("Excalidraw plugin is not available. Please install and enable it.");
		return null;
	}

	// Flatten all points for bounds calculation
	const allPoints = segments.flatMap(s => s.points);
	
	if (allPoints.length < 2) {
		new Notice("Not enough points to draw a graph. Check your equation and range.");
		return null;
	}

	try {
		// Clear the buffer before drawing
		ea.reset();
		
		const elementIds: string[] = [];

		// Calculate axis bounds from all points
		const xValues = allPoints.map(p => p.x);
		const yValues = allPoints.map(p => p.y);
		const xMin = Math.min(...xValues);
		const xMax = Math.max(...xValues);
		const yMin = Math.min(...yValues);
		const yMax = Math.max(...yValues);

		// Draw grid first (behind everything)
		if (opts.showGrid) {
			const gridIds = drawGrid(ea, xMin, xMax, yMin, yMax, xScale, yScale, opts);
			elementIds.push(...gridIds);
		}

		// Draw axes (so they appear behind the graph)
		if (opts.drawAxes) {
			const axisIds = drawAxes(ea, xMin, xMax, yMin, yMax, xScale, yScale, opts);
			elementIds.push(...axisIds);
		}

		// Draw border rectangle if enabled
		if (opts.drawBorder) {
			const borderId = drawBorder(ea, xMin, xMax, yMin, yMax, xScale, yScale, opts.borderColor);
			elementIds.push(borderId);
		}

		// Set style for the graph line
		ea.style.strokeColor = opts.strokeColor;
		ea.style.strokeWidth = opts.strokeWidth;
		ea.style.roughness = 1; // Hand-drawn Excalidraw style
		
		if (opts.useRoundEdges) {
			ea.style.roundness = { type: 2 }; // Round/curved connections
		} else {
			ea.style.roundness = null; // Sharp edges
		}

		// Draw each segment as a separate line
		for (const segment of segments) {
			if (segment.points.length < 2) continue;
			
			// Convert points to screen coordinates
			const screenPoints: [number, number][] = segment.points.map(p =>
				toScreenCoordinates(p, xScale, yScale)
			);

			// Add the graph line for this segment
			const lineId = ea.addLine(screenPoints);
			elementIds.push(lineId);
			
			// Apply roundness to the line element
			const lineElement = ea.getElement(lineId);
			if (lineElement) {
				if (opts.useRoundEdges) {
					lineElement.roundness = { type: 2 };
				} else {
					lineElement.roundness = null;
				}
			}
		}

		// Finalize: add elements to the view and save
		// repositionToCursor=true places the graph at the current cursor/view center
		await ea.addElementsToView(true, true);

		// Add a frame around all the elements
		try {
			const frameId = await addFrameAroundElements(ea, elementIds);
			if (frameId) {
				elementIds.push(frameId);
			}
		} catch {
			// Frame creation is optional, continue without it
		}

		return elementIds;
	} catch (error) {
		new Notice(`Failed to draw graph: ${error instanceof Error ? error.message : "Unknown error"}`);
		return null;
	}
}

/**
 * Draw grid lines on the canvas
 * @returns Array of element IDs for the grid elements
 */
function drawGrid(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ea: any,
	xMin: number,
	xMax: number,
	yMin: number,
	yMax: number,
	xScale: number,
	yScale: number,
	opts: DrawingOptions
): string[] {
	const gridIds: string[] = [];
	
	// Save current style
	const originalColor = ea.style.strokeColor;
	const originalWidth = ea.style.strokeWidth;

	// Set grid style (light, thin lines)
	ea.style.strokeColor = opts.gridColor;
	ea.style.strokeWidth = 0.5;
	ea.style.roughness = 0;
	ea.style.strokeStyle = "dashed";

	const xInterval = opts.xTickInterval > 0 ? opts.xTickInterval : 1;
	const yInterval = opts.yTickInterval > 0 ? opts.yTickInterval : 1;

	// Vertical grid lines
	const startX = Math.ceil(xMin / xInterval) * xInterval;
	for (let x = startX; x <= xMax; x += xInterval) {
		const screenX = x * xScale;
		const gridLineId = ea.addLine([
			[screenX, -yMax * yScale],
			[screenX, -yMin * yScale],
		]);
		gridIds.push(gridLineId);
	}

	// Horizontal grid lines
	const startY = Math.ceil(yMin / yInterval) * yInterval;
	for (let y = startY; y <= yMax; y += yInterval) {
		const screenY = -y * yScale;
		const gridLineId = ea.addLine([
			[xMin * xScale, screenY],
			[xMax * xScale, screenY],
		]);
		gridIds.push(gridLineId);
	}

	// Restore original style
	ea.style.strokeColor = originalColor;
	ea.style.strokeWidth = originalWidth;
	ea.style.strokeStyle = "solid";
	
	return gridIds;
}

/**
 * Draw X and Y axes on the canvas with optional tick marks and numbers
 * @returns Array of element IDs for the axis elements
 */
function drawAxes(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ea: any,
	xMin: number,
	xMax: number,
	yMin: number,
	yMax: number,
	xScale: number,
	yScale: number,
	opts: DrawingOptions
): string[] {
	const axisIds: string[] = [];
	const tickSize = 6; // pixels
	const arrowSize = 10; // pixels for arrow head
	
	// Save current style
	const originalColor = ea.style.strokeColor;
	const originalWidth = ea.style.strokeWidth;

	// Set axis style
	ea.style.strokeColor = opts.axisColor;
	ea.style.strokeWidth = 1;
	ea.style.roughness = 1;

	// Draw X-axis (horizontal line at y=0)
	const shouldDrawXAxis = (yMin <= 0 && yMax >= 0) || opts.forceShowXAxis;
	if (shouldDrawXAxis) {
		// Determine X-axis Y position:
		// - If y=0 is in range, draw at y=0
		// - If forced and curve is entirely above x-axis (yMin > 0), draw at bottom (yMin)
		// - If forced and curve is entirely below x-axis (yMax < 0), draw at top (yMax)
		let xAxisY: number;
		if (yMin <= 0 && yMax >= 0) {
			xAxisY = 0; // y=0 is in range, draw at origin
		} else if (yMax < 0) {
			xAxisY = -yMax * yScale; // Curve entirely below, draw at top
		} else {
			xAxisY = -yMin * yScale; // Curve entirely above, draw at bottom
		}
		
		const xAxisPoints: [number, number][] = [
			[xMin * xScale, xAxisY],
			[xMax * xScale, xAxisY],
		];
		const xAxisId = ea.addLine(xAxisPoints);
		axisIds.push(xAxisId);

		// Draw arrow at the end of X-axis
		if (opts.showArrows) {
			const arrowIds = drawArrowHead(ea, xMax * xScale, xAxisY, "right", arrowSize, opts.axisColor);
			axisIds.push(...arrowIds);
		}

		// Collect all X tick positions (regular + custom)
		const xTickPositions = new Set<number>();
		
		// Regular interval ticks
		if (opts.showTickMarks && opts.xTickInterval > 0) {
			const startX = Math.ceil(xMin / opts.xTickInterval) * opts.xTickInterval;
			for (let x = startX; x <= xMax; x += opts.xTickInterval) {
				if (Math.abs(x) > 0.0001) xTickPositions.add(x);
			}
		}
		
		// Add custom X ticks (force them regardless of data bounds, just check axis bounds)
		for (const x of opts.customXTicks) {
			if (x >= xMin && x <= xMax) {
				xTickPositions.add(x);
			}
		}

		// Draw all X ticks
		for (const x of xTickPositions) {
			const screenX = x * xScale;
			
			// Tick mark
			const tickId = ea.addLine([
				[screenX, xAxisY - tickSize / 2],
				[screenX, xAxisY + tickSize / 2],
			]);
			axisIds.push(tickId);

			// Number label
			if (opts.showNumbers) {
				ea.style.fontSize = 12;
				ea.style.fontFamily = 1; // Hand-drawn
				const label = Number.isInteger(x) ? x.toString() : x.toFixed(1);
				const textId = ea.addText(screenX, xAxisY + tickSize + 8, label, {
					textAlign: "center",
				});
				axisIds.push(textId);
			}
		}
	}

	// Draw Y-axis (vertical line at x=0)
	const shouldDrawYAxis = (xMin <= 0 && xMax >= 0) || opts.forceShowYAxis;
	if (shouldDrawYAxis) {
		// Determine Y-axis X position:
		// - If x=0 is in range, draw at x=0
		// - If forced and curve is entirely to the right (xMin > 0), draw at left (xMin)
		// - If forced and curve is entirely to the left (xMax < 0), draw at right (xMax)
		let yAxisX: number;
		if (xMin <= 0 && xMax >= 0) {
			yAxisX = 0; // x=0 is in range, draw at origin
		} else if (xMax < 0) {
			yAxisX = xMax * xScale; // Curve entirely to left, draw at right edge
		} else {
			yAxisX = xMin * xScale; // Curve entirely to right, draw at left edge
		}
		
		// Calculate Y axis range including custom ticks
		let yAxisMin = yMin;
		let yAxisMax = yMax;
		for (const y of opts.customYTicks) {
			if (y < yAxisMin) yAxisMin = y;
			if (y > yAxisMax) yAxisMax = y;
		}
		
		const yAxisPoints: [number, number][] = [
			[yAxisX, -yAxisMax * yScale],
			[yAxisX, -yAxisMin * yScale],
		];
		const yAxisId = ea.addLine(yAxisPoints);
		axisIds.push(yAxisId);

		// Draw arrow at the top of Y-axis
		if (opts.showArrows) {
			const arrowIds = drawArrowHead(ea, yAxisX, -yAxisMax * yScale, "up", arrowSize, opts.axisColor);
			axisIds.push(...arrowIds);
		}

		// Collect all Y tick positions (regular + custom)
		const yTickPositions = new Set<number>();
		
		// Regular interval ticks
		if (opts.showTickMarks && opts.yTickInterval > 0) {
			const startY = Math.ceil(yMin / opts.yTickInterval) * opts.yTickInterval;
			for (let y = startY; y <= yMax; y += opts.yTickInterval) {
				if (Math.abs(y) > 0.0001) yTickPositions.add(y);
			}
		}
		
		// Add custom Y ticks - ALWAYS add them, extend axis visually if needed
		for (const y of opts.customYTicks) {
			// Add custom ticks even if slightly outside data range
			yTickPositions.add(y);
		}

		// Draw all Y ticks
		for (const y of yTickPositions) {
			const screenY = -y * yScale;
			
			// Tick mark
			const tickId = ea.addLine([
				[yAxisX - tickSize / 2, screenY],
				[yAxisX + tickSize / 2, screenY],
			]);
			axisIds.push(tickId);

			// Number label
			if (opts.showNumbers) {
				ea.style.fontSize = 12;
				ea.style.fontFamily = 1;
				const label = Number.isInteger(y) ? y.toString() : y.toFixed(1);
				const textId = ea.addText(yAxisX - tickSize - 8, screenY, label, {
					textAlign: "right",
				});
				axisIds.push(textId);
			}
		}
	}

	// Restore original style
	ea.style.strokeColor = originalColor;
	ea.style.strokeWidth = originalWidth;
	
	return axisIds;
}

/**
 * Draw an arrow head at a specified position
 * @returns Array of element IDs for the arrow lines
 */
function drawArrowHead(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ea: any,
	x: number,
	y: number,
	direction: "up" | "down" | "left" | "right",
	size: number,
	color: string
): string[] {
	const ids: string[] = [];
	ea.style.strokeColor = color;
	ea.style.strokeWidth = 1;
	
	let p1: [number, number], p2: [number, number];
	
	switch (direction) {
		case "right":
			p1 = [x - size, y - size / 2];
			p2 = [x - size, y + size / 2];
			break;
		case "left":
			p1 = [x + size, y - size / 2];
			p2 = [x + size, y + size / 2];
			break;
		case "up":
			p1 = [x - size / 2, y + size];
			p2 = [x + size / 2, y + size];
			break;
		case "down":
			p1 = [x - size / 2, y - size];
			p2 = [x + size / 2, y - size];
			break;
	}
	
	// Draw two lines forming an arrow
	ids.push(ea.addLine([[x, y], p1]));
	ids.push(ea.addLine([[x, y], p2]));
	
	return ids;
}

/**
 * Draw a border rectangle around the graph
 */
function drawBorder(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ea: any,
	xMin: number,
	xMax: number,
	yMin: number,
	yMax: number,
	xScale: number,
	yScale: number,
	borderColor: string
): string {
	const padding = 10; // pixels
	
	const left = xMin * xScale - padding;
	const right = xMax * xScale + padding;
	const top = -yMax * yScale - padding;
	const bottom = -yMin * yScale + padding;
	const width = right - left;
	const height = bottom - top;

	ea.style.strokeColor = borderColor;
	ea.style.strokeWidth = 1;
	ea.style.roughness = 1;
	ea.style.fillStyle = "solid";
	ea.style.backgroundColor = "transparent";

	const rectId = ea.addRect(left, top, width, height);
	return rectId;
}

/**
 * Add a frame around all the specified elements
 * Frames in Excalidraw group elements together visually
 * @returns The frame element ID if successful, null otherwise
 */
async function addFrameAroundElements(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ea: any,
	elementIds: string[]
): Promise<string | null> {
	if (!elementIds.length) return null;
	
	try {
		// Get all the elements we just added to calculate bounds
		const viewElements = ea.getViewElements();
		const ourElements = viewElements.filter(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(el: any) => elementIds.includes(el.id)
		);
		
		if (ourElements.length === 0) return null;
		
		// Calculate bounding box of all elements
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;
		
		for (const el of ourElements) {
			const x = el.x ?? 0;
			const y = el.y ?? 0;
			const width = el.width ?? 0;
			const height = el.height ?? 0;
			
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x + width);
			maxY = Math.max(maxY, y + height);
		}
		
		// Add padding around the frame
		const padding = 20;
		minX -= padding;
		minY -= padding;
		maxX += padding;
		maxY += padding;
		
		const frameWidth = maxX - minX;
		const frameHeight = maxY - minY;
		
		// Create frame using EA API
		ea.reset();
		const frameId = ea.addFrame(minX, minY, frameWidth, frameHeight);
		
		// Add the frame to view
		await ea.addElementsToView(false, false);
		
		// Add all our elements to the frame
		const frameElement = ea.getViewElements().find(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(el: any) => el.id === frameId
		);
		
		if (frameElement) {
			// Update elements to be children of the frame
			for (const el of ourElements) {
				el.frameId = frameId;
			}
			// Refresh the view to apply the frame assignment
			ea.copyViewElementsToEAforEditing(ourElements);
			await ea.addElementsToView(false, true);
		}
		
		return frameId;
	} catch {
		return null;
	}
}
