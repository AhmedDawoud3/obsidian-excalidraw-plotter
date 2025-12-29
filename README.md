# Excalidraw Math Plotter

Plot mathematical function graphs directly onto Excalidraw canvases in Obsidian.
<img width="939" height="800" alt="image" src="https://github.com/user-attachments/assets/98f7ec68-3cad-410d-96a1-d5bbd37bf582" />


## Features

- **Plot mathematical functions**: Enter any mathematical expression using `x` as the variable
- **Real-time preview**: Adjust curve optimization with a live preview slider
- **Customizable appearance**: Configure stroke color, width, and graph styling
- **Axis options**: Show/hide tick marks, grid lines, arrows, and numeric labels
- **Quick presets**: One-click access to common functions (sine, cosine, parabola, etc.)
- **Discontinuity handling**: Automatically handles functions with discontinuities (tan, 1/x, etc.)
- **Smart curve optimization**: Uses Ramer-Douglas-Peucker algorithm for efficient point reduction

## Requirements

- [Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) must be installed and enabled

## Usage

1. Open an Excalidraw drawing
2. Run the command **Excalidraw Math Plotter: Insert function graph** (via Command Palette or hotkey)
3. Enter your mathematical equation (e.g., `sin(x)`, `x^2`, `log(x)`)
4. Configure the X range and appearance options
5. Use the optimization slider to adjust curve quality
6. Click **Apply** to insert the graph

## Supported Functions

The plugin uses [mathjs](https://mathjs.org/) for expression parsing. Examples:

- Basic: `x`, `x^2`, `x^3`, `sqrt(x)`, `abs(x)`
- Trigonometric: `sin(x)`, `cos(x)`, `tan(x)`
- Logarithmic/Exponential: `log(x)`, `exp(x)`, `log10(x)`
- Combinations: `sin(x) * x`, `x^2 + 2*x - 1`, `sin(x) + cos(2*x)`

## Installation

### From Community Plugins

1. Open **Settings → Community plugins**
2. Select **Browse** and search for "Excalidraw Math Plotter"
3. Select **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `VaultFolder/.obsidian/plugins/obsidian-excalidraw-plotter/`
3. Copy the downloaded files into this folder
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**

## License

MIT License - see [LICENSE](LICENSE) for details
