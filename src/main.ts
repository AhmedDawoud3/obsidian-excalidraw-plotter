import { Plugin, Notice } from "obsidian";
import { ExcalidrawPlotterSettings, DEFAULT_SETTINGS } from "./settings";
import { GraphSettingsModal } from "./modal";

export default class ExcalidrawPlotterPlugin extends Plugin {
    settings: ExcalidrawPlotterSettings;

    async onload() {
        await this.loadSettings();

        // Validate that Excalidraw plugin is available
        if (!this.isExcalidrawPluginAvailable()) {
            new Notice(
                "Excalidraw Math Plotter: Excalidraw plugin is not installed or enabled. Please install it first."
            );
        }

        // Register the "Insert Function Graph" command
        this.addCommand({
            id: "insert-function-graph",
            name: "Insert function graph",
            callback: () => {
                // Check if Excalidraw plugin is available
                if (!this.isExcalidrawPluginAvailable()) {
                    new Notice(
                        "Excalidraw plugin is not available. Please install and enable it first."
                    );
                    return;
                }

                // Check if we're in an Excalidraw view
                const activeLeaf = this.app.workspace.activeLeaf;
                const activeView = activeLeaf?.view;
                const isExcalidrawView = activeView?.getViewType() === "excalidraw";

                if (!isExcalidrawView) {
                    new Notice(
                        "Please open an Excalidraw drawing first."
                    );
                    return;
                }

                // Open the graph settings modal
                new GraphSettingsModal(this.app, this).open();
            },
        });
    }

    onunload() {
        // Cleanup is handled automatically by Obsidian
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Check if the Excalidraw plugin is installed and enabled
     */
    isExcalidrawPluginAvailable(): boolean {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const excalidrawPlugin = (this.app as any).plugins?.getPlugin(
            "obsidian-excalidraw-plugin"
        );
        return excalidrawPlugin != null;
    }

    /**
     * Get the Excalidraw Automate API
     * Returns null if not available
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getExcalidrawAPI(): any | null {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const excalidrawPlugin = (this.app as any).plugins?.getPlugin(
            "obsidian-excalidraw-plugin"
        );
        if (!excalidrawPlugin) {
            return null;
        }
        return excalidrawPlugin.ea ?? excalidrawPlugin.excalidrawAutomate;
    }
}