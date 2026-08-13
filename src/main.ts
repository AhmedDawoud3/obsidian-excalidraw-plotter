import { Plugin, Notice } from "obsidian";
import { ExcalidrawPlotterSettings, DEFAULT_SETTINGS } from "./settings";
import { GraphSettingsModal } from "./modal";
import type { AppWithPlugins, ExcalidrawAPI } from "./types";

export default class ExcalidrawPlotterPlugin extends Plugin {
    settings: ExcalidrawPlotterSettings;

    async onload() {
        await this.loadSettings();

        // Validate that Excalidraw plugin is available
        if (!this.isExcalidrawPluginAvailable()) {
            new Notice(
                "Excalidraw math plotter: Excalidraw plugin is not installed or enabled. Please install it first."
            );
        }

        // Register the "Insert Function Graph" command
        this.addCommand({
            id: "insert-function-graph",
            name: "Insert function graph",
            checkCallback: (checking) => {
                if (!this.isExcalidrawPluginAvailable()) {
                    if (!checking) {
                        new Notice(
                            "Excalidraw plugin is not available. Please install and enable it first."
                        );
                    }
                    return false;
                }

                // Check if we're in an Excalidraw view
                const leaf = this.app.workspace.getMostRecentLeaf();
                const isExcalidrawView = leaf?.view?.getViewType() === "excalidraw";

                if (!isExcalidrawView) {
                    if (!checking) {
                        new Notice("Please open an Excalidraw drawing first.");
                    }
                    return false;
                }

                if (!checking) {
                    new GraphSettingsModal(this.app, this).open();
                }
                return true;
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
            await this.loadData() as Partial<ExcalidrawPlotterSettings> | null
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Check if the Excalidraw plugin is installed and enabled
     */
    isExcalidrawPluginAvailable(): boolean {
        const appWithPlugins = this.app as AppWithPlugins;
        const excalidrawPlugin = appWithPlugins.plugins?.getPlugin(
            "obsidian-excalidraw-plugin"
        );
        return excalidrawPlugin != null;
    }

    /**
     * Get the Excalidraw Automate API
     * Returns null if not available
     */
    getExcalidrawAPI(): ExcalidrawAPI | null {
        const appWithPlugins = this.app as AppWithPlugins;
        const excalidrawPlugin = appWithPlugins.plugins?.getPlugin(
            "obsidian-excalidraw-plugin"
        );
        if (!excalidrawPlugin) {
            return null;
        }
        return excalidrawPlugin.ea ?? excalidrawPlugin.excalidrawAutomate ?? null;
    }
}