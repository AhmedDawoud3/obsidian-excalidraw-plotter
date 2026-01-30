import * as math from "mathjs";

export interface Point {
	x: number;
	y: number;
}

/**
 * Represents a continuous segment of points (split at discontinuities)
 */
export interface PointSegment {
	points: Point[];
}

/**
 * MathEngine - Handles parsing and evaluation of mathematical expressions
 * Uses mathjs for safe parsing and evaluation of user-provided formulas
 */
export class MathEngine {
	/**
	 * Threshold for detecting discontinuities (large jumps in y values)
	 */
	private static readonly DISCONTINUITY_THRESHOLD = 100;

	/**
	 * Evaluate a mathematical formula over a range of x values
	 * @param formula - The mathematical expression as a string (e.g., "sin(x) * x")
	 * @param xMin - The minimum x value
	 * @param xMax - The maximum x value
	 * @param step - The step size between x values (default 0.1)
	 * @returns Array of {x, y} points, excluding any points where evaluation failed
	 */
	static evaluate(
		formula: string,
		xMin: number,
		xMax: number,
		step: number = 0.1
	): Point[] {
		const points: Point[] = [];

		// Compile the formula once for better performance
		let compiledExpression: math.EvalFunction;
		try {
			compiledExpression = math.compile(formula);
		} catch {
			throw new Error(
				`Invalid formula: "${formula}". Please check your syntax.`
			);
		}

		// Iterate over the x range and evaluate y for each x
		for (let x = xMin; x <= xMax; x += step) {
			try {
				const y: unknown = compiledExpression.evaluate({ x: x });

				// Only include valid numeric results
				if (
					typeof y === "number" &&
					isFinite(y) &&
					!isNaN(y)
				) {
					points.push({ x, y });
				}
				// Skip complex numbers, infinities, NaN, etc.
			} catch {
				// Skip points where evaluation fails (e.g., division by zero, log of negative)
				continue;
			}
		}

		return points;
	}

	/**
	 * Evaluate a formula and split into segments at discontinuities
	 * This is essential for functions like tan(x), 1/x, etc.
	 * @param formula - The mathematical expression
	 * @param xMin - Minimum x value
	 * @param xMax - Maximum x value
	 * @param step - Step size
	 * @returns Array of point segments, each representing a continuous portion of the curve
	 */
	static evaluateWithDiscontinuities(
		formula: string,
		xMin: number,
		xMax: number,
		step: number = 0.1
	): PointSegment[] {
		const segments: PointSegment[] = [];
		let currentSegment: Point[] = [];

		// Compile the formula once for better performance
		let compiledExpression: math.EvalFunction;
		try {
			compiledExpression = math.compile(formula);
		} catch {
			throw new Error(
				`Invalid formula: "${formula}". Please check your syntax.`
			);
		}

		let lastY: number | null = null;

		// Iterate over the x range and evaluate y for each x
		for (let x = xMin; x <= xMax; x += step) {
			try {
				const y: unknown = compiledExpression.evaluate({ x: x });

				// Only include valid numeric results
				if (typeof y === "number" && isFinite(y) && !isNaN(y)) {
					// Check for discontinuity (large jump in y value)
					if (lastY !== null) {
						const jump = Math.abs(y - lastY);
						const threshold = this.DISCONTINUITY_THRESHOLD * step;
						
						if (jump > threshold) {
							// Discontinuity detected - save current segment and start new one
							if (currentSegment.length >= 2) {
								segments.push({ points: currentSegment });
							}
							currentSegment = [];
						}
					}

					currentSegment.push({ x, y });
					lastY = y;
				} else {
					// Invalid point - this also indicates a discontinuity
					if (currentSegment.length >= 2) {
						segments.push({ points: currentSegment });
					}
					currentSegment = [];
					lastY = null;
				}
			} catch {
				// Evaluation failed - start a new segment
				if (currentSegment.length >= 2) {
					segments.push({ points: currentSegment });
				}
				currentSegment = [];
				lastY = null;
			}
		}

		// Don't forget the last segment
		if (currentSegment.length >= 2) {
			segments.push({ points: currentSegment });
		}

		return segments;
	}

	/**
	 * Detect if a formula likely has discontinuities (tan, 1/x, etc.)
	 */
	static hasDiscontinuities(formula: string): boolean {
		const lowerFormula = formula.toLowerCase().replace(/\s/g, "");
		// Common patterns that produce discontinuities
		const discontinuityPatterns = [
			/tan\(/,      // tan(x)
			/cot\(/,      // cot(x)
			/sec\(/,      // sec(x)
			/csc\(/,      // csc(x)
			/1\/x/,       // 1/x
			/\/x(?![a-z])/, // something divided by x
			/\/\(.*x.*\)/, // something divided by expression with x
		];
		return discontinuityPatterns.some(pattern => pattern.test(lowerFormula));
	}

	/**
	 * Validate a formula without evaluating it over a range
	 * @param formula - The mathematical expression to validate
	 * @returns true if the formula is valid, false otherwise
	 */
	static isValidFormula(formula: string): boolean {
		try {
			math.compile(formula);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get a list of common example formulas for user reference
	 */
	static getExampleFormulas(): string[] {
		return [
			"sin(x)",
			"cos(x)",
			"tan(x)",
			"x^2",
			"x^3",
			"sqrt(x)",
			"log(x)",
			"exp(x)",
			"sin(x) * x",
			"1/x",
			"abs(x)",
			"sin(x) + cos(2*x)",
		];
	}

	/**
	 * Simplify a curve using the Ramer-Douglas-Peucker algorithm
	 * This finds the minimum number of points needed to represent the curve
	 * within a given tolerance. A straight line will use only 2 points.
	 * 
	 * @param points - Array of points to simplify
	 * @param epsilon - Tolerance for simplification (default 0.01, relative to scale)
	 * @returns Simplified array of points
	 */
	static simplifyPoints(points: Point[], epsilon: number = 0.01): Point[] {
		if (points.length < 3) {
			return points;
		}

		return MathEngine.rdpSimplify(points, epsilon);
	}

	/**
	 * Ramer-Douglas-Peucker algorithm implementation
	 * Recursively finds the point furthest from the line between start and end,
	 * and only keeps points that are significant.
	 */
	private static rdpSimplify(points: Point[], epsilon: number): Point[] {
		if (points.length < 3) {
			return points;
		}

		// Find the point with the maximum distance from the line
		const start = points[0] as Point;
		const end = points[points.length - 1] as Point;
		
		let maxDistance = 0;
		let maxIndex = 0;

		for (let i = 1; i < points.length - 1; i++) {
			const point = points[i] as Point;
			const distance = MathEngine.perpendicularDistance(point, start, end);
			if (distance > maxDistance) {
				maxDistance = distance;
				maxIndex = i;
			}
		}

		// If the max distance is greater than epsilon, recursively simplify
		if (maxDistance > epsilon) {
			// Recursive call for the two segments
			const left = MathEngine.rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
			const right = MathEngine.rdpSimplify(points.slice(maxIndex), epsilon);

			// Combine results (remove duplicate point at junction)
			return left.slice(0, -1).concat(right);
		} else {
			// All points between start and end are within epsilon
			// Just keep the endpoints
			return [start, end];
		}
	}

	/**
	 * Calculate the perpendicular distance from a point to a line
	 * defined by two points (lineStart and lineEnd)
	 */
	private static perpendicularDistance(
		point: Point,
		lineStart: Point,
		lineEnd: Point
	): number {
		const dx = lineEnd.x - lineStart.x;
		const dy = lineEnd.y - lineStart.y;

		// If the line is actually a point, return distance to that point
		const lineLengthSquared = dx * dx + dy * dy;
		if (lineLengthSquared === 0) {
			return Math.sqrt(
				Math.pow(point.x - lineStart.x, 2) + 
				Math.pow(point.y - lineStart.y, 2)
			);
		}

		// Calculate perpendicular distance using cross product formula
		const numerator = Math.abs(
			dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
		);
		const denominator = Math.sqrt(lineLengthSquared);

		return numerator / denominator;
	}
}
