# Phase 2: Node.js CLI Implementation

This folder contains the Node.js command-line interface for the raytracer.

## Files

- **package.json** - NPM package metadata and scripts
- **cli-bootstrap.js** - Entry point (executable) that loads all modules in order
- **cli.js** - Command-line argument parsing and rendering orchestration
- **rt.objfile-node.js** - Node.js implementation of OBJ file loading (using fs module)

## Installation

```bash
cd phase2-cli
# No installation needed - pure Node.js, no external dependencies
```

## Usage

```bash
# Basic render with defaults
node cli-bootstrap.js

# Render specific scene
node cli-bootstrap.js --scene scene1 --width 900 --height 550 --output render.ppm

# Preview (small/fast)
node cli-bootstrap.js --scene scene1 --width 150 --height 84 --output preview.ppm

# High quality
node cli-bootstrap.js --scene scene1 --quality 3 --output hires.ppm

# Get help
node cli-bootstrap.js --help
```

## How It Works

1. **cli-bootstrap.js** runs as the entry point
   - Loads all raytracer modules in correct dependency order
   - Uses `eval()` to execute each module in global scope
   - Sets up the environment for cli.js

2. **cli.js** handles:
   - Command-line argument parsing
   - Scene selection and initialization
   - Rendering orchestration
   - PPM file output

3. **rt.objfile-node.js** provides:
   - fs-based OBJ file loading (instead of browser FileReader)
   - Vertex parsing
   - Triangle creation from faces
   - Scene construction from OBJ data

## Architecture

### Load Order

```
cli-bootstrap.js
  ↓
Load all rt.*.js modules (core raytracer)
  ↓
Load raytracer-core.js (shared logic)
  ↓
Load rt.examples.js (scene definitions)
  ↓
Load rt.objfile-node.js (Node.js file I/O)
  ↓
Load cli.js (CLI interface)
  ↓
Parse command line and render
```

### Rendering Pipeline

```
Command line args
  ↓
initRaytracer(width, height)  ← Initialize from raytracer-core.js
  ↓
Scene function (e.g., scene1())  ← From rt.examples.js
  ↓
Create world object
  ↓
renderSceneSync()  ← From raytracer-core.js
  ↓
Convert pixels to PPM
  ↓
Write PPM file
```

## PPM Output Format

The output is a **P3 PPM file** (plain text):
- Line 1: `P3` (magic number)
- Line 2: `WIDTH HEIGHT` (image dimensions)
- Line 3: `255` (maximum color value)
- Remaining: RGB triplets (0-255) separated by spaces

Example:
```
P3
500 281
255
255 0 0  255 0 0  255 0 0  ...
0 255 0  0 255 0  0 255 0  ...
...
```

You can convert PPM to other formats using standard tools:
```bash
# PPM → PNG (using ImageMagick)
convert render.ppm render.png

# PPM → JPEG
convert render.ppm render.jpg
```

## Available Scenes

All scenes from `rt.examples.js` are available:
- `scene1` - Default scene
- `mySkyBox` - Sky box scene
- `earth` - Earth scene
- `cm_cube` - Cube scene
- `endGame` - End game scene

Call the scene function from the browser to see what it renders!

## Configuration

Command-line options:

| Option | Default | Description |
|--------|---------|-------------|
| `--scene NAME` | `scene1` | Which scene to render |
| `--width NUM` | `500` | Image width in pixels |
| `--height NUM` | `281` | Image height in pixels |
| `--output FILE` | `render.ppm` | Output filename |
| `--quality NUM` | `1` | Render quality (higher = more samples) |
| `--verbose` | `true` | Show progress output |
| `--help` | - | Show help message |

## Performance Tips

- **Preview first**: Use `--width 150 --height 84` for fast preview
- **Gradually increase**: Test at 150x84, then 300x168, then 500x281
- **Quality setting**: 1 = fast, 3+ = very slow but beautiful
- **Run overnight**: Full resolution (900x550) with quality 5 can take hours

## Troubleshooting

### "Scene not found"
```
Error: Scene not found: scenex. Available: scene1, mySkyBox, earth, ...
```
Check the scene name spelling. Use `--help` to see available scenes.

### "File not found"
```
Error loading OBJ file: File not found: path/to/file.obj
```
Make sure the OBJ file path is correct and the file exists.

### "No pixels to write"
If rendering produces no output, check:
1. Is the scene initialized? (Does it call `scene(...)`?)
2. Does the scene have objects? (Check `Data.o.s`)
3. Is the camera valid?

### Slow rendering
- Rendering is **intentionally synchronous** (no UI blocking)
- For large images, this takes time
- Use smaller preview sizes first: `--width 150 --height 84`

## Integration with Browser

Both browser and CLI use **identical rendering logic** from `raytracer-core.js`:
- Same `renderSceneSync()` function
- Same `color_at()` calculations
- Same scene functions from `rt.examples.js`

The only difference is output:
- **Browser**: Draws to HTML5 canvas in real-time
- **CLI**: Renders synchronously, writes PPM file

## Next Steps (Phase 3)

- Add error handling enhancements
- Add animation support (multiple frames)
- Add progress bar for long renders
- Support more output formats (PNG, JPEG)
- Performance optimizations

---

**Ready to render?**

```bash
cd /workspaces/RTDT/phase2-cli
node cli-bootstrap.js --scene scene1 --width 150 --height 84 --output test.ppm
```
