export interface ExcalidrawPlotterSettings {
    defaultEquation: string;
    defaultXMin: number;
    defaultXMax: number;
    defaultScale: number;
    defaultStrokeColor: string;
    defaultStrokeWidth: number;
    // Last used settings (auto-saved)
    lastShowTickMarks: boolean;
    lastXTickInterval: number;
    lastYTickInterval: number;
    lastShowNumbers: boolean;
    lastDrawBorder: boolean;
    lastShowGrid: boolean;
    lastShowArrows: boolean;
    lastTolerance: number;
}

export const DEFAULT_SETTINGS: ExcalidrawPlotterSettings = {
    defaultEquation: "sin(x)",
    defaultXMin: -10,
    defaultXMax: 10,
    defaultScale: 50,
    defaultStrokeColor: "#1e1e1e",
    defaultStrokeWidth: 2,
    // Last used settings defaults
    lastShowTickMarks: true,
    lastXTickInterval: 1,
    lastYTickInterval: 1,
    lastShowNumbers: true,
    lastDrawBorder: false,
    lastShowGrid: false,
    lastShowArrows: true,
    lastTolerance: 1,
};

/**
 * Common function presets for quick selection
 */
export interface FunctionPreset {
    name: string;
    equation: string;
    xMin?: number;
    xMax?: number;
}

export const FUNCTION_PRESETS: FunctionPreset[] = [
    { name: "Sine", equation: "sin(x)", xMin: -2 * Math.PI, xMax: 2 * Math.PI },
    { name: "Cosine", equation: "cos(x)", xMin: -2 * Math.PI, xMax: 2 * Math.PI },
    { name: "Tangent", equation: "tan(x)", xMin: -Math.PI, xMax: Math.PI },
    { name: "Parabola", equation: "x^2", xMin: -5, xMax: 5 },
    { name: "Cubic", equation: "x^3", xMin: -3, xMax: 3 },
    { name: "Square Root", equation: "sqrt(x)", xMin: 0, xMax: 10 },
    { name: "Logarithm", equation: "log(x)", xMin: 0.1, xMax: 10 },
    { name: "Exponential", equation: "exp(x)", xMin: -2, xMax: 3 },
    { name: "Absolute", equation: "abs(x)", xMin: -5, xMax: 5 },
    { name: "Reciprocal", equation: "1/x", xMin: -5, xMax: 5 },
    { name: "Linear", equation: "x", xMin: -5, xMax: 5 },
    { name: "Semicircle", equation: "sqrt(1-x^2)", xMin: -1, xMax: 1 },
];