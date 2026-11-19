# Phase 2: Quick Start

## File Structure

```
/workspaces/RTDT/
├── cli/                    ← NEW: Node.js CLI implementation
│   ├── package.json               ← NPM metadata
│   ├── cli-bootstrap.js           ← Entry point (executable)
│   ├── cli.js                     ← CLI logic
│   ├── rtdt_objfile-node.js         ← Node.js file I/O
│   └── README.md                  ← Full documentation
│
├── raytracer-core.js              ← Shared rendering logic (from Phase 1)
├── raytracer-ui.js                ← Browser UI (from Phase 1)
├── raytracer.html                 ← Browser entry point
├── rtdt_*.js                        ← Core raytracer modules
└── ...
```

## Test It Now

```bash
# Navigate to cli
cd /workspaces/RTDT/cli

# Try the help
node cli-bootstrap.js --help

# Render a small preview (should take ~30 seconds)
node cli-bootstrap.js --scene scene1 --width 150 --height 84 --output test.ppm

# Check the output
ls -lh test.ppm
file test.ppm
```

## What Happens When You Run It

1. **cli-bootstrap.js** loads all modules in dependency order
2. **cli.js** parses command-line arguments
3. Scene function executes (e.g., `scene1()`)
4. **renderSceneSync()** renders all pixels
5. PPM file written to disk
6. Done!

## Command Examples

```bash
# Minimal (fastest)
node cli-bootstrap.js --scene scene1 --width 150 --height 84 --output preview.ppm

# Standard
node cli-bootstrap.js --scene scene1 --width 500 --height 281 --output render.ppm

# High resolution
node cli-bootstrap.js --scene scene1 --width 900 --height 550 --output hires.ppm

# Better quality (more samples per pixel)
node cli-bootstrap.js --scene scene1 --quality 3 --output quality.ppm

# Different scene
node cli-bootstrap.js --scene earth --output earth.ppm

# Silent (no progress output)
node cli-bootstrap.js --scene scene1 --no-verbose --output silent.ppm
```

## Available Scenes

From `rtdt_examples.js`:
- `scene1` - Default scene (multiple objects)
- `mySkyBox` - Sky box scene
- `earth` - Textured earth
- `cm_cube` - Metal cube
- `endGame` - Complex scene

## Architecture

```
Browser                           Node.js CLI
─────────────────────────────     ──────────────
HTML loads scripts                cli-bootstrap.js
        ↓                                ↓
raytracer-core.js                raytracer-core.js
        ↓                                ↓
raytracer-ui.js                  cli.js
(DOM initialization)             (CLI parsing)
        ↓                                ↓
renderImage()                    renderSceneSync()
(async to canvas)                (sync to pixels)
        ↓                                ↓
Canvas display                   PPM file
```

## Key Functions Used

| Function | Module | Purpose |
|----------|--------|---------|
| `initRaytracer()` | raytracer-core.js | Set up rendering state |
| `scene(...)` | raytracer-core.js | Create scene group |
| `renderSceneSync()` | raytracer-core.js | Synchronous rendering |
| `colorTo255()` | raytracer-core.js | Convert color for output |
| `parseArguments()` | cli.js | Parse command line |
| `renderScene()` | cli.js | Orchestrate rendering |
| `writePPMFile()` | cli.js | Write output file |
| `loadOBJFile()` | rtdt_objfile-node.js | Load OBJ models |

## Typical Performance

On a modern machine (2023+):

| Resolution | Time |
|------------|------|
| 150x84 | ~5-10 sec |
| 300x168 | ~20-30 sec |
| 500x281 | ~1-2 min |
| 900x550 | ~5-10 min |
| 900x550 (quality 3) | ~20-30 min |

## Viewing Results

PPM files can be converted to other formats:

```bash
# Using ImageMagick (if installed)
convert test.ppm test.png
convert test.ppm test.jpg

# Using Netpbm (if installed)
pnmtopng test.ppm > test.png

# Direct viewing (slower, large files)
# PPM is plain text - open in any image viewer
file test.ppm
```

## Debugging

If something goes wrong:

```bash
# Check that modules load
node cli-bootstrap.js --help

# Try smallest possible render
node cli-bootstrap.js --scene scene1 --width 50 --height 28 --output tiny.ppm

# Check verbose output
node cli-bootstrap.js --scene scene1 --verbose

# Check JavaScript errors
node cli-bootstrap.js --scene scene1 2>&1 | head -50
```

## Common Issues

| Issue | Fix |
|-------|-----|
| "Cannot find module" | Check file paths in cli-bootstrap.js |
| "Scene not found" | Check scene name spelling with `--help` |
| "ENOENT: no such file" | Check output directory exists |
| Very slow | Use smaller resolution for testing |
| No output | Check `Data.o` is populated by scene function |

## Next Steps

1. **Test renders** at various resolutions
2. **Tweak scenes** - modify rtdt_examples.js
3. **Add new scenes** - create custom scene functions
4. **Phase 3** - Add animation support, progress bar, etc.

## Full Documentation

See `README.md` in this folder for complete details.

---

**Go render something!** 🚀

```bash
cd /workspaces/RTDT/cli
node cli-bootstrap.js --scene scene1 --width 150 --height 84 --output my-render.ppm
```
