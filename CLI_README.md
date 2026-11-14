# RTDT - Ray Tracer

A JavaScript ray tracer that works as both a **CLI tool** and an **interactive web application**.

## Architecture

This project demonstrates a unified codebase that runs in two different environments:

- **CLI (Primary)**: `node cli.js` - Command-line rendering with PPM output
- **Web UI**: `webapp.html` - Single-file HTML with embedded CSS/JS (no external dependencies)

### Key Design Principles

✅ **CLI is Primary** - Node.js command-line tool for batch rendering
✅ **Single-file Web UI** - No build step, no external dependencies  
✅ **Shared Core** - Both environments use identical raytracer code
✅ **Vanilla JavaScript** - No transpilation, no ES6 modules, no npm dependencies
✅ **CSS1/CSS2 Only** - Simple, lightweight styling

## Quick Start

### CLI Usage

```bash
# Install (if needed - no dependencies required!)
npm install

# Render default scene to PPM
node cli.js

# List available scenes
node cli.js --list-scenes

# Render a specific scene
node cli.js --scene scene1 --width 800 --height 600 --output render.ppm

# Small preview render
node cli.js --scene scene1 --width 150 --height 84 --output preview.ppm

# High quality (more samples)
node cli.js --scene scene1 --quality 3 --output hires.ppm

# Get help
node cli.js --help
```

### Web UI

```bash
# Simply open in browser (no server needed!)
open webapp.html
# or
firefox webapp.html
```

**Note**: The webapp.html file loads raytracer modules from the same directory. Place it alongside all rtdt_*.js files.

## Available Scenes

- **scene1** - Default scene with primitives (sphere + cube)
- **scene2** - Complex scene with multiple objects
- **scene3** - Advanced rendering scene
- **mySkyBox** - Sky box demonstration
- **earth** - Earth texture mapping
- **cm_cube** - Cube demonstration  
- **endGame** - Complex scene

## File Structure

```
RTDT/
├── package.json                 # Node.js project metadata
├── cli.js                       # CLI entry point (executable)
├── webapp.html                  # Single-file web UI (24KB)
│
├── raytracer-core.js            # Shared rendering engine
├── raytracer-ui.js              # Browser UI only
│
├── rtdt_*.js                      # Raytracer modules
│   ├── rtdt_math.js              # Math utilities
│   ├── rtdt_core.js              # Core structures
│   ├── rtdt_matrix.js            # Matrix operations
│   ├── rtdt_matrix-transform.js  # Transformations
│   ├── rtdt_ray.js               # Ray operations
│   ├── rtdt_light.js             # Lighting
│   ├── rtdt_material.js          # Material properties
│   ├── rtdt_world.js             # World structure
│   ├── rtdt_shade.js             # Shading
│   ├── rtdt_p+e.js               # Primitives + Effects
│   ├── rtdt_pattern.js           # Patterns
│   ├── rtdt_examples.js          # Scene definitions
│   ├── rtdt_graphics.js          # Canvas rendering
│   └── rtdt_objfile-node.js      # OBJ file loading (Node.js)
│
└── scenes/                      # Scene assets
    └── *.obj files              # 3D models
```

## CLI Options

```
OPTIONS:
  --scene NAME        Scene to render (default: scene1)
  --width NUM         Image width in pixels (default: 500)
  --height NUM        Image height in pixels (default: 281)
  --output FILE       PPM output file (default: render.ppm)
  --quality NUM       Render quality/samples (default: 1)
  --help              Show help message
  --list-scenes       List available scenes
```

## Output Formats

### PPM (Portable Pixmap)

The CLI outputs **P3 PPM format** (plain text), which is human-readable and universal.

Convert PPM to other formats using ImageMagick:

```bash
# Convert to PNG
convert render.ppm render.png

# Convert to JPEG
convert render.ppm render.jpg

# Convert to WebP
convert render.ppm render.webp
```

### Web UI

The web UI can download:
- **PPM** - Portable Pixmap format
- **PNG** - Via HTML5 canvas

## Web UI Features

- **Scene Selection** - Choose from available scenes
- **Camera Control** - Adjust camera position (X, Y, Z)
- **Render Settings** - Configure width, height, quality
- **Interactive Rendering** - Real-time display on canvas
- **Download** - Export as PPM or PNG
- **Keyboard Shortcuts** - Quick controls (R=Render, S=Stop, ?=Help)

## Performance

Rendering times depend on resolution and quality:

- **Preview (150x84, quality 1)**: ~50ms
- **Standard (500x281, quality 1)**: ~250ms
- **Large (800x600, quality 1)**: ~1-2 seconds
- **High-quality (any size, quality 3)**: 3-10x slower

Use `--quality 1` for fast previews, higher values for production renders.

## Development

### Module Loading Order

The raytracer modules must be loaded in strict dependency order:

1. rtdt_math.js
2. rtdt_core.js
3. rtdt_matrix-transform.js
4. rtdt_matrix.js
5. rtdt_ray.js
6. rtdt_light.js
7. rtdt_material.js
8. rtdt_world.js
9. rtdt_shade.js
10. rtdt_p+e.js
11. rtdt_pattern.js
12. rtdt_tests.js
13. rtdt_examples.js
14. raytracer-core.js
15. rtdt_objfile-node.js (CLI only)
16. raytracer-ui.js (Web only)

Both cli.js and webapp.html respect this order.

### Adding a New Scene

Edit `rtdt_examples.js` and add a new function:

```javascript
function myScene() {
  prepCanvas();  // no-op in CLI, initializes canvas in browser
  
  // Set up camera
  Data.c.setCTransform(view_transform(
    point(0, 1, 5),    // from
    point(0, 0, 0),    // to
    vector(0, 1, 0)    // up
  ));
  
  // Create objects
  var sphere = sphere();
  sphere.material.color = colour(1, 0, 0);
  
  // Set up world
  var group = group();
  group.addChild(sphere);
  Data.o = group;
  Data.l = new point_light(point(-5, 5, 5), colour(1, 1, 1));
  
  // CLI: renderImage() is stubbed, renderer uses renderSceneSync()
  // Web: renderImage() displays on canvas
  renderImage();
}
```

Then add to `cli.js` scenes object:

```javascript
global.scenes = {
  // ... existing scenes ...
  myScene: typeof myScene === 'function' ? myScene : undefined
};
```

## Troubleshooting

### CLI: "ReferenceError: X is not defined"

The module loading order is critical. Check that modules are loaded in the correct sequence. Most likely missing dependency.

### CLI: "Cannot find module 'fs'"

This shouldn't happen in Node.js. Verify you're running with `node cli.js`, not `node` directly.

### Web UI: "TypeError: scene not found"

Ensure all rtdt_*.js files are in the same directory as webapp.html. The webapp fetches them dynamically.

### Web UI: Rendering is slow

The canvas rendering is JavaScript-only and runs in the main thread. For large resolutions or high quality, rendering may take several seconds. Use smaller preview sizes while developing.

### PPM file is huge

PPM format is uncompressed plain text. For a 800x600 image, expect ~5-10MB files. Use `convert` to compress to PNG or JPEG.

## Technical Details

### Why P3 PPM?

- Universal format (opened by any image viewer)
- Human-readable (view raw pixel values)
- No compression artifacts
- Standard for raytracer output
- No external libraries required

### Why No Build Step?

This project intentionally avoids:
- Bundling/transpilation
- Module systems beyond globals
- Build tools/npm scripts

Benefits:
- Single-file web app (copy-paste to run)
- Easier to modify code (no rebuild)
- Educational (see all source code)
- No installation required for web UI

### Why Separate CLI and Web?

- CLI: Optimized for batch rendering, no UI overhead
- Web: Interactive, real-time feedback, visual controls
- Both share identical rendering core

This demonstrates how to structure code for multiple target environments without code duplication.

## License

MIT

## References

- [Ray Tracing: The Complete Book](https://pragprog.com/titles/jbtracer/the-ray-tracer-challenge/)
- [PPM Format Specification](http://netpbm.sourceforge.net/doc/ppm.html)
- [ImageMagick](https://imagemagick.org/)
