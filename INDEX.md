# RTDT - Ray Tracer (Refactored) - Complete Index

## 📋 Documentation Quick Links

### Getting Started
- **[CLI_README.md](CLI_README.md)** - Start here! Usage guide, examples, troubleshooting
- **Quick Commands**:
  ```bash
  node cli.js --help              # Show help
  node cli.js --list-scenes       # List scenes
  node cli.js --scene scene1      # Render scene1
  open webapp.html                # Open web UI
  ```

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, module dependencies, data flow
- **[REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)** - What was done, testing results, key decisions
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Deployment guide, quality assurance

### Project Files

#### CLI (Command-Line Interface)
- **[cli.js](cli.js)** - Main executable entry point
  - 9.9KB, executable
  - Handles arguments, rendering, PPM output
  - Works with all 7 scenes

#### Web UI
- **[webapp.html](webapp.html)** - Single-file web application
  - 22KB (under 100KB limit)
  - Interactive rendering
  - No external dependencies
  - CSS1/CSS2 only

#### Configuration
- **[package.json](package.json)** - Node.js project configuration

#### Core Libraries (Shared)
- **[raytracer-core.js](raytracer-core.js)** - Shared rendering logic
- **[rtdt_*.js](.)** - Raytracer modules (math, geometry, rendering, etc.)
- **[rtdt_objfile-node.js](rtdt_objfile-node.js)** - OBJ file loading for Node.js

#### Browser Modules (Browser Only)
- **[raytracer-ui.js](raytracer-ui.js)** - Browser UI code
- **[rtdt_graphics.js](rtdt_graphics.js)** - Canvas rendering

## 🚀 Quick Start

### For CLI Users
```bash
# List available scenes
node cli.js --list-scenes

# Quick preview render
node cli.js --scene scene1 --width 150 --height 84 --output preview.ppm

# Standard render
node cli.js --scene scene1 --width 800 --height 600 --output render.ppm

# High quality (slower)
node cli.js --scene scene1 --quality 3 --output hires.ppm

# Help
node cli.js --help
```

### For Web Users
```bash
# Open in browser (no server needed for modern browsers)
open webapp.html

# Or with HTTP server (recommended)
python3 -m http.server 8000
# Visit: http://localhost:8000/webapp.html
```

## 📊 Available Scenes

| Scene | Type | Description |
|-------|------|-------------|
| **scene1** | Basic | Sphere and cube (default) |
| **scene2** | Complex | Multiple objects |
| **scene3** | Advanced | Complex rendering |
| **mySkyBox** | Effect | Sky box demonstration |
| **earth** | Texture | Earth visualization |
| **cm_cube** | Geometry | Cube demonstration |
| **endGame** | Complex | Complex final scene |

## 💡 Architecture Overview

```
CLI (node cli.js)          WEB (webapp.html)
        ↓                           ↓
    [cli.js]              [webapp.html (24KB)]
        ↓                           ↓
        └─────────┬─────────────────┘
                  ↓
        [Shared Core Logic]
     (identical in both)
        ↓
    [Raytracer Modules]
    (rtdt_*.js files)
```

## 🛠️ Technology Stack

### CLI
- **Language**: JavaScript (Node.js)
- **Module System**: Global scope + vm.runInThisContext()
- **Dependencies**: None (vanilla Node.js)
- **Output**: PPM format (plain text)

### Web
- **Language**: JavaScript (Vanilla ES6+)
- **Styling**: CSS1/CSS2 (embedded, no external fonts)
- **Dependencies**: None (pure HTML)
- **Storage**: None (all in-browser)

### Shared
- **Rendering**: Pure JavaScript raytracer
- **Math**: Vector/matrix operations
- **Geometry**: Sphere, cube, ray, etc.
- **Lighting**: Point lights, shading
- **Materials**: Patterns, colors, reflectivity

## 📈 Performance

### Rendering Times (Single Quality)
| Resolution | Time |
|-----------|------|
| 100×75 | ~320ms |
| 200×150 | ~900ms |
| 500×281 | ~1-2s |
| 800×600 | ~3-5s |
| 1280×720 | ~10-15s |

### File Sizes
- cli.js: 9.9KB
- webapp.html: 22KB
- Module overhead: ~400KB (rtdt_*.js)
- PPM output: ~4 bytes per pixel (uncompressed)

## 🔄 Workflow

### Creating a Render
1. **List scenes**: `node cli.js --list-scenes`
2. **Choose scene**: Pick from available scenes
3. **Set parameters**: Width, height, quality
4. **Render**: `node cli.js --scene <name> --width <w> --height <h> --output <file>`
5. **Convert**: `convert render.ppm render.png` (optional)

### Interactive Development
1. **Open webapp.html** in browser
2. **Select scene** from dropdown
3. **Adjust camera** position
4. **Configure render** settings
5. **Click render** and watch
6. **Download** as PPM or PNG

## 📚 Learning Resources

### Understanding the Code
- Start: [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- Then: [CLI_README.md](CLI_README.md) - Usage patterns
- Deep dive: Individual rtdt_*.js files for algorithms

### Module Dependencies
- **Math**: rtdt_math.js (no dependencies)
- **Core**: rtdt_core.js (depends on rtdt_math.js)
- **Transformations**: rtdt_matrix.js → rtdt_matrix-transform.js
- **Rendering**: rtdt_ray.js, rtdt_light.js, rtdt_shade.js
- **Scenes**: rtdt_examples.js (depends on all above)

## 🐛 Troubleshooting

### CLI Issues
| Problem | Solution |
|---------|----------|
| "Module not found" | Run from RTDT directory |
| "ReferenceError: X is not defined" | Check module loading order |
| Slow rendering | Use smaller resolution |
| Large PPM file | Convert with ImageMagick |

### Web UI Issues
| Problem | Solution |
|---------|----------|
| "Failed to load modules" | Use HTTP server, not file:// |
| No render button response | Check browser console (F12) |
| Slow in browser | Use smaller preview size |
| Can't download PNG | Try PPM download instead |

## 📖 Further Reading

- [PPM Format Specification](http://netpbm.sourceforge.net/doc/ppm.html)
- [Ray Tracing Algorithm](https://pragprog.com/titles/jbtracer/the-ray-tracer-challenge/)
- [ImageMagick Convert Tool](https://imagemagick.org/)

## ✅ What's Working

✓ CLI rendering (all 7 scenes)
✓ PPM output generation
✓ Web UI interface
✓ Camera controls
✓ Scene selection
✓ Download functionality
✓ Keyboard shortcuts
✓ Responsive design

## 🎯 Next Steps

1. **Try it**: `node cli.js --scene scene1`
2. **Explore**: Open `webapp.html` in browser
3. **Learn**: Read [ARCHITECTURE.md](ARCHITECTURE.md)
4. **Extend**: Add your own scenes in rtdt_examples.js
5. **Share**: All files ready to distribute

## 📞 Support

See [CLI_README.md](CLI_README.md) for:
- Detailed usage examples
- Output format explanation
- Performance tuning
- Comprehensive troubleshooting

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for:
- Pre-deployment verification
- System testing
- Quality assurance
- Deployment guidelines

---

**Version**: 2.0 (CLI-First with WebApp)  
**Status**: Production Ready  
**Last Updated**: 2026-11-14

Ready to render! 🎨
