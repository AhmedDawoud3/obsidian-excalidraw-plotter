import { App, Modal, Notice, Setting } from "obsidian";
import { MathEngine, Point, PointSegment } from "./math-engine";
import { drawGraphSegments, deleteElements } from "./drawing-engine";
import { ExcalidrawPlotterSettings, FUNCTION_PRESETS } from "./settings";
import ExcalidrawPlotterPlugin from "./main";

/**
 * SVG namespace for creating SVG elements
 */
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Create an SVG element with the specified paths
 */
function createSvgIcon(
    container: HTMLElement,
    width: number,
    height: number,
    paths: { tag: string; attrs: Record<string, string> }[]
): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    for (const pathDef of paths) {
        const el = document.createElementNS(SVG_NS, pathDef.tag);
        for (const [key, value] of Object.entries(pathDef.attrs)) {
            el.setAttribute(key, value);
        }
        svg.appendChild(el);
    }

    container.appendChild(svg);
    return svg;
}

/**
 * Predefined SVG icon definitions
 */
const SVG_ICONS = {
    pencil: [
        { tag: "path", attrs: { d: "M12 20h9" } },
        { tag: "path", attrs: { d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" } },
    ],
    target: [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "3" } },
    ],
    pulse: [
        { tag: "path", attrs: { d: "M22 12h-4l-3 9L9 3l-3 9H2" } },
    ],
    trash: [
        { tag: "path", attrs: { d: "M3 6h18" } },
        { tag: "path", attrs: { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" } },
        { tag: "path", attrs: { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" } },
    ],
    check: [
        { tag: "polyline", attrs: { points: "20 6 9 17 4 12" } },
    ],
    zigzag: [
        { tag: "polyline", attrs: { points: "3 6 9 3 15 9 21 6" } },
        { tag: "polyline", attrs: { points: "3 18 9 15 15 21 21 18" } },
    ],
};

/**
 * Modal for configuring and inserting a function graph
 */
export class GraphSettingsModal extends Modal {
    private equation: string;
    private xMin: number;
    private xMax: number;
    private yMin: number | null;
    private yMax: number | null;
    private useYLimits: boolean;
    private xScale: number;
    private yScale: number;
    private strokeColor: string;
    private strokeWidth: number;
    private showTickMarks: boolean;
    private xTickInterval: number;
    private yTickInterval: number;
    private showNumbers: boolean;
    private drawBorder: boolean;
    private showGrid: boolean;
    private showArrows: boolean;
    private forceShowXAxis: boolean;
    private forceShowYAxis: boolean;
    private customXTicks: string;
    private customYTicks: string;

    private plugin: ExcalidrawPlotterPlugin;
    private settings: ExcalidrawPlotterSettings;
    private onSubmit: () => void;

    constructor(
        app: App,
        plugin: ExcalidrawPlotterPlugin,
        onSubmit?: () => void
    ) {
        super(app);
        this.plugin = plugin;
        this.settings = plugin.settings;
        this.onSubmit = onSubmit ?? (() => { });

        // Initialize with defaults from settings (including last used values)
        this.equation = this.settings.defaultEquation;
        this.xMin = this.settings.defaultXMin;
        this.xMax = this.settings.defaultXMax;
        this.yMin = null;
        this.yMax = null;
        this.useYLimits = false;
        this.xScale = this.settings.defaultScale;
        this.yScale = this.settings.defaultScale;
        this.strokeColor = this.settings.defaultStrokeColor;
        this.strokeWidth = this.settings.defaultStrokeWidth;
        this.showTickMarks = this.settings.lastShowTickMarks;
        this.xTickInterval = this.settings.lastXTickInterval;
        this.yTickInterval = this.settings.lastYTickInterval;
        this.showNumbers = this.settings.lastShowNumbers;
        this.drawBorder = this.settings.lastDrawBorder;
        this.showGrid = this.settings.lastShowGrid;
        this.showArrows = this.settings.lastShowArrows;
        this.forceShowXAxis = false;
        this.forceShowYAxis = false;
        this.customXTicks = "";
        this.customYTicks = "";
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Insert function graph" });

        // Quick preset buttons
        const presetsContainer = contentEl.createEl("div", {
            cls: "excalidraw-plotter-presets",
        });
        presetsContainer.createEl("span", { text: "Quick presets: ", cls: "presets-label" });

        const presetsButtons = presetsContainer.createEl("div", { cls: "presets-buttons" });

        // Create equation input reference for updating
        let equationInput: HTMLInputElement | null = null;
        let xMinInput: HTMLInputElement | null = null;
        let xMaxInput: HTMLInputElement | null = null;

        for (const preset of FUNCTION_PRESETS.slice(0, 8)) {
            const btn = presetsButtons.createEl("button", {
                text: preset.name,
                cls: "preset-btn",
            });
            btn.addEventListener("click", () => {
                this.equation = preset.equation;
                if (preset.xMin !== undefined) this.xMin = preset.xMin;
                if (preset.xMax !== undefined) this.xMax = preset.xMax;

                // Update input fields
                if (equationInput) equationInput.value = this.equation;
                if (xMinInput) xMinInput.value = this.xMin.toString();
                if (xMaxInput) xMaxInput.value = this.xMax.toString();
            });
        }

        // Equation input
        new Setting(contentEl)
            .setName("Formula")
            .setDesc("Enter an expression")
            .addText((text) => {
                equationInput = text.inputEl;
                text
                    .setPlaceholder("Enter formula")
                    .setValue(this.equation)
                    .onChange((value) => {
                        this.equation = value;
                    });
            });

        // X Range - Min
        new Setting(contentEl)
            .setName("X minimum")
            .setDesc("Starting value for X")
            .addText((text) => {
                xMinInput = text.inputEl;
                text
                    .setPlaceholder("-10")
                    .setValue(this.xMin.toString())
                    .onChange((value) => {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                            this.xMin = num;
                        }
                    });
            });

        // X Range - Max
        new Setting(contentEl)
            .setName("X maximum")
            .setDesc("Ending value for X")
            .addText((text) => {
                xMaxInput = text.inputEl;
                text
                    .setPlaceholder("10")
                    .setValue(this.xMax.toString())
                    .onChange((value) => {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                            this.xMax = num;
                        }
                    });
            });

        // Y limits toggle and inputs
        let yMinInput: HTMLInputElement | null = null;
        let yMaxInput: HTMLInputElement | null = null;

        new Setting(contentEl)
            .setName("Constrain y-range")
            .setDesc("Limit the vertical range")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.useYLimits)
                    .onChange((value) => {
                        this.useYLimits = value;
                        if (yMinInput) yMinInput.disabled = !value;
                        if (yMaxInput) yMaxInput.disabled = !value;
                    })
            );

        // Y Range - Min
        new Setting(contentEl)
            .setName("Y minimum")
            .setDesc("Lower bound for y values")
            .addText((text) => {
                yMinInput = text.inputEl;
                yMinInput.disabled = !this.useYLimits;
                text
                    .setPlaceholder("-10")
                    .setValue(this.yMin?.toString() ?? "")
                    .onChange((value) => {
                        const num = parseFloat(value);
                        this.yMin = isNaN(num) ? null : num;
                    });
            });

        // Y Range - Max
        new Setting(contentEl)
            .setName("Y maximum")
            .setDesc("Upper bound for y values")
            .addText((text) => {
                yMaxInput = text.inputEl;
                yMaxInput.disabled = !this.useYLimits;
                text
                    .setPlaceholder("10")
                    .setValue(this.yMax?.toString() ?? "")
                    .onChange((value) => {
                        const num = parseFloat(value);
                        this.yMax = isNaN(num) ? null : num;
                    });
            });

        // X Scale
        new Setting(contentEl)
            .setName("X scale")
            .setDesc("Pixels per unit on X axis (higher = wider)")
            .addText((text) =>
                text
                    .setPlaceholder("50")
                    .setValue(this.xScale.toString())
                    .onChange((value) => {
                        const num = parseFloat(value);
                        if (!isNaN(num) && num > 0) {
                            this.xScale = num;
                        }
                    })
            );

        // Y Scale
        new Setting(contentEl)
            .setName("Y scale")
            .setDesc("Pixels per unit on y-axis (higher = taller)")
            .addText((text) =>
                text
                    .setPlaceholder("50")
                    .setValue(this.yScale.toString())
                    .onChange((value) => {
                        const num = parseFloat(value);
                        if (!isNaN(num) && num > 0) {
                            this.yScale = num;
                        }
                    })
            );

        // Stroke width with slider
        new Setting(contentEl)
            .setName("Stroke width")
            .setDesc("Thickness of the graph line")
            .addSlider((slider) =>
                slider
                    .setLimits(1, 6, 1)
                    .setValue(this.strokeWidth)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.strokeWidth = value;
                    })
            );

        // Separator
        contentEl.createEl("h4", { text: "Axis options" });

        // Show tick marks toggle
        new Setting(contentEl)
            .setName("Show tick marks")
            .setDesc("Display tick marks on axes")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.showTickMarks)
                    .onChange((value) => {
                        this.showTickMarks = value;
                    })
            );

        // X Tick interval
        new Setting(contentEl)
            .setName("X tick interval")
            .setDesc("Spacing between tick marks on X axis")
            .addText((text) =>
                text
                    .setPlaceholder("1")
                    .setValue(this.xTickInterval.toString())
                    .onChange((value) => {
                        const num = parseFloat(value);
                        if (!isNaN(num) && num > 0) {
                            this.xTickInterval = num;
                        }
                    })
            );

        // Y Tick interval
        new Setting(contentEl)
            .setName("Y tick interval")
            .setDesc("Spacing between tick marks on y-axis")
            .addText((text) =>
                text
                    .setPlaceholder("1")
                    .setValue(this.yTickInterval.toString())
                    .onChange((value) => {
                        const num = parseFloat(value);
                        if (!isNaN(num) && num > 0) {
                            this.yTickInterval = num;
                        }
                    })
            );

        // Show numbers toggle
        new Setting(contentEl)
            .setName("Show numbers")
            .setDesc("Display numeric labels on axes")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.showNumbers)
                    .onChange((value) => {
                        this.showNumbers = value;
                    })
            );

        // Show grid toggle
        new Setting(contentEl)
            .setName("Show grid")
            .setDesc("Display grid lines at tick intervals")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.showGrid)
                    .onChange((value) => {
                        this.showGrid = value;
                    })
            );

        // Show arrows toggle
        new Setting(contentEl)
            .setName("Show arrows")
            .setDesc("Display arrows at axis ends")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.showArrows)
                    .onChange((value) => {
                        this.showArrows = value;
                    })
            );

        // Force show X-axis toggle
        new Setting(contentEl)
            .setName("Force show X-axis")
            .setDesc("Always display X-axis even if y=0 is outside range")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.forceShowXAxis)
                    .onChange((value) => {
                        this.forceShowXAxis = value;
                    })
            );

        // Force show Y-axis toggle
        new Setting(contentEl)
            .setName("Force y-axis visibility")
            .setDesc("Always display y-axis even if outside range")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.forceShowYAxis)
                    .onChange((value) => {
                        this.forceShowYAxis = value;
                    })
            );

        // Draw border toggle
        new Setting(contentEl)
            .setName("Draw border")
            .setDesc("Add a rectangle frame around the graph")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.drawBorder)
                    .onChange((value) => {
                        this.drawBorder = value;
                    })
            );


        // Custom X ticks
        new Setting(contentEl)
            .setName("Horizontal tick marks")
            .setDesc("Comma-separated values")
            .addText((text) =>
                text
                    .setPlaceholder("-1, 0, 1")
                    .setValue(this.customXTicks)
                    .onChange((value) => {
                        this.customXTicks = value;
                    })
            );

        // Custom Y ticks
        new Setting(contentEl)
            .setName("Custom y-ticks")
            .setDesc("Specify y values")
            .addText((text) =>
                text
                    .setPlaceholder("-1, 1")
                    .setValue(this.customYTicks)
                    .onChange((value) => {
                        this.customYTicks = value;
                    })
            );
        // Example formulas hint
        const examplesEl = contentEl.createEl("div", {
            cls: "excalidraw-plotter-examples",
        });
        examplesEl.createEl("small", {
            text: "Examples: " + MathEngine.getExampleFormulas().slice(0, 6).join(", "),
        });

        // Submit button
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Insert graph")
                    .setCta()
                    .onClick(() => {
                        void this.handleSubmit();
                    })
            )
            .addButton((btn) =>
                btn.setButtonText("Cancel").onClick(() => {
                    this.close();
                })
            );
    }

    private async handleSubmit() {
        // Validate equation
        if (!this.equation.trim()) {
            new Notice("Please enter an equation.");
            return;
        }

        if (!MathEngine.isValidFormula(this.equation)) {
            new Notice("Invalid equation. Please check your syntax.");
            return;
        }

        // Validate range
        if (this.xMin >= this.xMax) {
            new Notice("X minimum must be less than X maximum.");
            return;
        }

        // Validate scale
        if (this.xScale <= 0 || this.yScale <= 0) {
            new Notice("Scale values must be positive numbers.");
            return;
        }

        // Save last used settings
        this.settings.lastShowTickMarks = this.showTickMarks;
        this.settings.lastXTickInterval = this.xTickInterval;
        this.settings.lastYTickInterval = this.yTickInterval;
        this.settings.lastShowNumbers = this.showNumbers;
        this.settings.lastDrawBorder = this.drawBorder;
        this.settings.lastShowGrid = this.showGrid;
        this.settings.lastShowArrows = this.showArrows;
        await this.plugin.saveSettings();

        // Close this modal and open the tolerance preview modal
        this.close();

        const previewModal = new TolerancePreviewModal(
            this.app,
            this.plugin,
            this.equation,
            this.xMin,
            this.xMax,
            this.useYLimits ? this.yMin : null,
            this.useYLimits ? this.yMax : null,
            this.xScale,
            this.yScale,
            this.strokeColor,
            this.strokeWidth,
            this.showTickMarks,
            this.xTickInterval,
            this.yTickInterval,
            this.showNumbers,
            this.drawBorder,
            this.showGrid,
            this.showArrows,
            this.forceShowXAxis,
            this.forceShowYAxis,
            this.parseCustomTicks(this.customXTicks),
            this.parseCustomTicks(this.customYTicks),
            this.onSubmit
        );
        previewModal.open();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private parseCustomTicks(input: string): number[] {
        if (!input.trim()) return [];
        return input
            .split(",")
            .map((s) => parseFloat(s.trim()))
            .filter((n) => !isNaN(n));
    }
}

/**
 * Real-time tolerance preview modal
 * Shows a slider that updates the graph in real-time as you adjust
 */
class TolerancePreviewModal extends Modal {
    private equation: string;
    private xMin: number;
    private xMax: number;
    private yMin: number | null;
    private yMax: number | null;
    private xScale: number;
    private yScale: number;
    private strokeColor: string;
    private strokeWidth: number;
    private showTickMarks: boolean;
    private xTickInterval: number;
    private yTickInterval: number;
    private showNumbers: boolean;
    private drawBorder: boolean;
    private showGrid: boolean;
    private showArrows: boolean;
    private forceShowXAxis: boolean;
    private forceShowYAxis: boolean;
    private customXTicks: number[];
    private customYTicks: number[];
    private tolerance: number = 1;
    private plugin: ExcalidrawPlotterPlugin;
    private onSubmit: () => void;

    // Raw segments (before simplification) - supports discontinuous functions
    private rawSegments: PointSegment[] = [];
    private maxRange: number = 1;
    private hasDiscontinuities: boolean = false;

    // Currently drawn element IDs
    private currentElementIds: string[] = [];
    private debounceTimer: number | null = null;

    constructor(
        app: App,
        plugin: ExcalidrawPlotterPlugin,
        equation: string,
        xMin: number,
        xMax: number,
        yMin: number | null,
        yMax: number | null,
        xScale: number,
        yScale: number,
        strokeColor: string,
        strokeWidth: number,
        showTickMarks: boolean,
        xTickInterval: number,
        yTickInterval: number,
        showNumbers: boolean,
        drawBorder: boolean,
        showGrid: boolean,
        showArrows: boolean,
        forceShowXAxis: boolean,
        forceShowYAxis: boolean,
        customXTicks: number[],
        customYTicks: number[],
        onSubmit: () => void
    ) {
        super(app);
        this.plugin = plugin;
        this.equation = equation;
        this.xMin = xMin;
        this.xMax = xMax;
        this.yMin = yMin;
        this.yMax = yMax;
        this.xScale = xScale;
        this.yScale = yScale;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
        this.showTickMarks = showTickMarks;
        this.xTickInterval = xTickInterval;
        this.yTickInterval = yTickInterval;
        this.showNumbers = showNumbers;
        this.drawBorder = drawBorder;
        this.showGrid = showGrid;
        this.showArrows = showArrows;
        this.forceShowXAxis = forceShowXAxis;
        this.forceShowYAxis = forceShowYAxis;
        this.customXTicks = customXTicks;
        this.customYTicks = customYTicks;
        this.onSubmit = onSubmit;

        // Load last used tolerance
        this.tolerance = plugin.settings.lastTolerance;
    }

    async onOpen() {
        const { contentEl } = this;

        // Position modal to the side so it doesn't hide the figure
        this.modalEl.addClass("excalidraw-plotter-preview-modal");

        contentEl.addClass("excalidraw-plotter-preview-content");

        // Check if function has discontinuities (like tan)
        this.hasDiscontinuities = MathEngine.hasDiscontinuities(this.equation);

        // Generate raw points/segments once
        const range = this.xMax - this.xMin;
        const step = Math.max(0.01, range / 500);

        if (this.hasDiscontinuities) {
            // Use segment-aware evaluation for functions like tan(x)
            this.rawSegments = MathEngine.evaluateWithDiscontinuities(
                this.equation, this.xMin, this.xMax, step
            );
        } else {
            // Regular evaluation
            const points = MathEngine.evaluate(this.equation, this.xMin, this.xMax, step);
            this.rawSegments = [{ points }];
        }

        // Apply Y limits if specified - clip points to the Y range
        if (this.yMin !== null || this.yMax !== null) {
            this.rawSegments = this.applyYLimits(this.rawSegments);
        }

        const totalPoints = this.rawSegments.reduce((sum, seg) => sum + seg.points.length, 0);

        if (totalPoints < 2) {
            new Notice("Could not generate enough points.");
            this.close();
            return;
        }

        // Calculate max range for epsilon scaling (from all segments)
        const allPoints = this.rawSegments.flatMap(s => s.points);
        const yValues = allPoints.map(p => p.y);
        const xValues = allPoints.map(p => p.x);
        const yRange = Math.max(...yValues) - Math.min(...yValues);
        const xRange = Math.max(...xValues) - Math.min(...xValues);
        this.maxRange = Math.max(yRange, xRange, 1);

        // Header section
        const header = contentEl.createEl("div", { cls: "preview-header" });
        const headerIcon = header.createEl("div", { cls: "preview-header-icon" });
        createSvgIcon(headerIcon, 20, 20, SVG_ICONS.pencil);
        const headerText = header.createEl("div", { cls: "preview-header-text" });
        headerText.createEl("span", { text: "Curve optimization", cls: "preview-title" });
        headerText.createEl("span", { text: "Adjust point density", cls: "preview-subtitle" });

        // Equation display with label
        const equationSection = contentEl.createEl("div", { cls: "preview-equation-section" });
        equationSection.createEl("span", { text: "Function", cls: "preview-section-label" });
        equationSection.createEl("code", {
            text: `y = ${this.equation}`,
            cls: "preview-equation",
        });

        // Stats bar (segments + range info)
        const statsBar = contentEl.createEl("div", { cls: "preview-stats-bar" });
        const segmentStat = statsBar.createEl("div", { cls: "preview-stat" });
        segmentStat.createEl("span", { text: this.rawSegments.length.toString(), cls: "stat-value" });
        segmentStat.createEl("span", { text: this.rawSegments.length === 1 ? "segment" : "segments", cls: "stat-label" });

        const rangeStat = statsBar.createEl("div", { cls: "preview-stat" });
        rangeStat.createEl("span", { text: `[${this.xMin}, ${this.xMax}]`, cls: "stat-value" });
        rangeStat.createEl("span", { text: "X range", cls: "stat-label" });

        // Quality control section
        const qualitySection = contentEl.createEl("div", { cls: "preview-quality-section" });
        qualitySection.createEl("span", { text: "Quality", cls: "preview-section-label" });

        // Quality indicator bar
        const qualityIndicator = qualitySection.createEl("div", { cls: "preview-quality-indicator" });
        const qualityBar = qualityIndicator.createEl("div", { cls: "quality-bar" });
        const qualityFill = qualityBar.createEl("div", { cls: "quality-fill" });
        const qualityLabel = qualityIndicator.createEl("span", { cls: "quality-label" });

        // Slider with labels
        const sliderContainer = qualitySection.createEl("div", { cls: "preview-slider-container" });
        const sliderRow = sliderContainer.createEl("div", { cls: "preview-slider-row" });

        const leftLabel = sliderRow.createEl("div", { cls: "slider-endpoint" });
        leftLabel.createEl("span", { text: "●●●", cls: "endpoint-dots high" });
        leftLabel.createEl("span", { text: "Precise", cls: "slider-label" });

        const slider = sliderRow.createEl("input", { cls: "preview-slider" });
        slider.type = "range";
        slider.min = "1";
        slider.max = "50";
        slider.value = this.tolerance.toString();

        const rightLabel = sliderRow.createEl("div", { cls: "slider-endpoint" });
        rightLabel.createEl("span", { text: "●", cls: "endpoint-dots low" });
        rightLabel.createEl("span", { text: "Simple", cls: "slider-label" });

        // Points counter
        const pointsDisplay = qualitySection.createEl("div", { cls: "preview-points-display" });
        const pointsIcon = pointsDisplay.createEl("span", { cls: "points-icon" });
        createSvgIcon(pointsIcon, 14, 14, SVG_ICONS.target);
        const pointsText = pointsDisplay.createEl("span", { cls: "points-text" });

        // Edge style badge
        const edgeInfoEl = contentEl.createEl("div", { cls: "preview-edge-badge" });
        const edgeIcon = edgeInfoEl.createEl("span", { cls: "edge-icon" });
        createSvgIcon(edgeIcon, 12, 12, SVG_ICONS.pulse);
        edgeInfoEl.createEl("span", {
            text: "Auto-detecting curve style...",
            cls: "edge-info-text",
        });

        // Update handler with quality indicator
        slider.addEventListener("input", () => {
            this.tolerance = parseInt(slider.value);
            this.updateQualityIndicator(qualityFill, qualityLabel);
            this.updatePreview(pointsText, edgeInfoEl);
        });

        // Button container
        const buttonContainer = contentEl.createEl("div", { cls: "preview-button-container" });

        const cancelBtn = buttonContainer.createEl("button", {
            cls: "preview-cancel-btn",
        });
        createSvgIcon(cancelBtn, 14, 14, SVG_ICONS.trash);
        cancelBtn.createEl("span", { text: "Discard" });
        cancelBtn.addEventListener("click", () => {
            // Delete the drawn elements and close
            if (this.currentElementIds.length > 0) {
                deleteElements(this.app, this.currentElementIds);
            }
            this.close();
        });

        const doneBtn = buttonContainer.createEl("button", {
            cls: "mod-cta preview-done-btn",
        });
        createSvgIcon(doneBtn, 14, 14, SVG_ICONS.check);
        doneBtn.createEl("span", { text: "Apply" });
        doneBtn.addEventListener("click", () => {
            // Save tolerance setting
            void (async () => {
                this.plugin.settings.lastTolerance = this.tolerance;
                await this.plugin.saveSettings();
                new Notice("Graph inserted!");
                this.onSubmit();
                this.close();
            })();
        });

        // Keyboard shortcut hint
        const keyHint = contentEl.createEl("div", { cls: "preview-key-hint" });
        keyHint.createEl("kbd", { text: "Enter" });
        keyHint.createEl("span", { text: "To apply" });

        // Register keyboard handler
        this.scope.register([], "Enter", async () => {
            this.plugin.settings.lastTolerance = this.tolerance;
            await this.plugin.saveSettings();
            new Notice(`Graph inserted!`);
            this.onSubmit();
            this.close();
            return false;
        });

        this.scope.register([], "Escape", () => {
            if (this.currentElementIds.length > 0) {
                deleteElements(this.app, this.currentElementIds);
            }
            this.close();
            return false;
        });

        // Initialize quality indicator
        this.updateQualityIndicator(qualityFill, qualityLabel);

        // Draw initial graph
        await this.drawWithTolerance(this.tolerance, pointsText, edgeInfoEl);
    }

    /**
     * Update the visual quality indicator based on tolerance
     */
    private updateQualityIndicator(qualityFill: HTMLElement, qualityLabel: HTMLElement) {
        const quality = 100 - ((this.tolerance - 1) / 49 * 100);
        qualityFill.setCssProps({ "width": `${quality}%` });

        // Update color based on quality level
        if (quality >= 70) {
            qualityFill.className = "quality-fill high";
            qualityLabel.textContent = "High fidelity";
        } else if (quality >= 40) {
            qualityFill.className = "quality-fill medium";
            qualityLabel.textContent = "Balanced";
        } else {
            qualityFill.className = "quality-fill low";
            qualityLabel.textContent = "Lightweight";
        }
    }

    private updatePreview(pointsText: HTMLElement, edgeInfoEl?: HTMLElement) {
        // Debounce to avoid too many redraws
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
            void this.drawWithTolerance(this.tolerance, pointsText, edgeInfoEl);
        }, 50);
    }

    /**
     * Detect if the mathematical function has any true sharp corners
     * This analyzes the RAW high-resolution curve, not the simplified version
     * Functions like abs(x) have a genuine mathematical corner at x=0
     * Functions like sin(x), x^2 are smooth everywhere
     * 
     * Returns true if round edges should be used (curve is smooth)
     * Returns false if sharp edges should be used (curve has corners)
     */
    private shouldUseRoundEdges(simplifiedSegments: PointSegment[]): boolean {
        // Analyze the RAW segments (original high-resolution curve) to detect
        // true mathematical corners, not artifacts from simplification

        // Very short simplified curves (like a line) look better with sharp edges
        const simplifiedPointCount = simplifiedSegments.reduce(
            (sum, seg) => sum + seg.points.length, 0
        );
        if (simplifiedPointCount <= 2) {
            return false;
        }

        // Look for sharp corners in the original mathematical curve
        // A sharp corner is where the derivative changes abruptly
        // We use a sliding window to detect sudden direction changes
        const sharpCornerThreshold = Math.PI / 4; // 45 degrees - a true corner like abs(x)

        for (const segment of this.rawSegments) {
            const points = segment.points;
            if (points.length < 5) continue;

            // Sample the curve at regular intervals to detect corners
            // Use a window size that's small enough to catch real corners
            // but large enough to ignore noise
            const windowSize = Math.max(3, Math.floor(points.length / 50));

            for (let i = windowSize; i < points.length - windowSize; i++) {
                const prevPoint = points[i - windowSize];
                const currPoint = points[i];
                const nextPoint = points[i + windowSize];

                if (!prevPoint || !currPoint || !nextPoint) continue;

                // Calculate incoming and outgoing direction vectors
                const v1x = currPoint.x - prevPoint.x;
                const v1y = currPoint.y - prevPoint.y;
                const v2x = nextPoint.x - currPoint.x;
                const v2y = nextPoint.y - currPoint.y;

                // Normalize vectors
                const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
                const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

                if (len1 < 0.0001 || len2 < 0.0001) continue;

                const n1x = v1x / len1, n1y = v1y / len1;
                const n2x = v2x / len2, n2y = v2y / len2;

                // Calculate angle between directions
                const dot = n1x * n2x + n1y * n2y;
                const cross = n1x * n2y - n1y * n2x;
                const angle = Math.abs(Math.atan2(cross, dot));

                // If we find a sharp corner in the raw curve, use sharp edges
                if (angle > sharpCornerThreshold) {
                    return false; // Use sharp edges
                }
            }
        }

        // No sharp corners found in the mathematical curve
        // Use round edges for smooth rendering
        return true;
    }

    private async drawWithTolerance(
        tolerance: number,
        pointsText: HTMLElement,
        edgeInfoEl?: HTMLElement
    ) {
        // Delete previous elements
        if (this.currentElementIds.length > 0) {
            deleteElements(this.app, this.currentElementIds);
            this.currentElementIds = [];
        }

        // Simplify each segment
        const toleranceFactor = tolerance / 50;
        const epsilon = this.maxRange * toleranceFactor * 0.125;

        const simplifiedSegments: PointSegment[] = this.rawSegments.map(segment => ({
            points: MathEngine.simplifyPoints([...segment.points], epsilon)
        }));

        const totalSimplifiedPoints = simplifiedSegments.reduce(
            (sum, seg) => sum + seg.points.length, 0
        );
        const totalRawPoints = this.rawSegments.reduce(
            (sum, seg) => sum + seg.points.length, 0
        );

        // Calculate compression ratio for display
        const compressionRatio = Math.round((1 - totalSimplifiedPoints / totalRawPoints) * 100);

        // Update display with animated counter effect
        pointsText.textContent = `${totalSimplifiedPoints} points (${compressionRatio}% reduced)`;

        // Auto-detect best edge style
        const useRoundEdges = this.shouldUseRoundEdges(simplifiedSegments);

        if (edgeInfoEl) {
            const edgeText = edgeInfoEl.querySelector(".edge-info-text");
            if (edgeText) {
                edgeText.textContent = useRoundEdges ? "Smooth curves" : "Sharp corners";
            }
            // Update icon based on style
            const edgeIcon = edgeInfoEl.querySelector(".edge-icon");
            if (edgeIcon instanceof HTMLElement) {
                edgeIcon.empty();
                createSvgIcon(edgeIcon, 12, 12, useRoundEdges ? SVG_ICONS.pulse : SVG_ICONS.zigzag);
            }
        }

        // Draw new graph with segments
        const elementIds = await drawGraphSegments(this.app, simplifiedSegments, this.xScale, this.yScale, {
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            drawAxes: true,
            showTickMarks: this.showTickMarks,
            xTickInterval: this.xTickInterval,
            yTickInterval: this.yTickInterval,
            showNumbers: this.showNumbers,
            drawBorder: this.drawBorder,
            showGrid: this.showGrid,
            showArrows: this.showArrows,
            forceShowXAxis: this.forceShowXAxis,
            forceShowYAxis: this.forceShowYAxis,
            customXTicks: this.customXTicks,
            customYTicks: this.customYTicks,
            useRoundEdges: useRoundEdges,
        });

        if (elementIds) {
            this.currentElementIds = elementIds;
        }
    }

    /**
     * Apply Y limits to segments by filtering and splitting at boundaries
     * Points outside yMin/yMax are removed, and segments are split when
     * crossing the boundary
     */
    private applyYLimits(segments: PointSegment[]): PointSegment[] {
        const result: PointSegment[] = [];

        for (const segment of segments) {
            let currentSegment: Point[] = [];

            for (const point of segment.points) {
                const inRange = this.isInYRange(point.y);

                if (inRange) {
                    currentSegment.push(point);
                } else {
                    // Point is outside range, save current segment if it has enough points
                    if (currentSegment.length >= 2) {
                        result.push({ points: currentSegment });
                    }
                    currentSegment = [];
                }
            }

            // Don't forget the last segment
            if (currentSegment.length >= 2) {
                result.push({ points: currentSegment });
            }
        }

        return result;
    }

    /**
     * Check if a Y value is within the specified limits
     */
    private isInYRange(y: number): boolean {
        if (this.yMin !== null && y < this.yMin) return false;
        if (this.yMax !== null && y > this.yMax) return false;
        return true;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
    }
}
