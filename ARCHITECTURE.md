# RTDT Architecture: CLI-First with Embedded WebApp

## Design Overview

RTDT is structured as a **dual-target JavaScript application** with shared core logic:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTDT Ray Tracer                               │
├─────────────────┬───────────────────────────────────────────────┤
│   CLI (Node.js) │ WebApp (Browser)                              │
│                 │                                                │
│  cli.js         │ webapp.html (24KB single file)                │
│  - Arguments    │ - Scene selector                              │
│  - PPM output   │ - Camera controls                             │
│  - Batch jobs   │ - Interactive rendering                       │
│  - File I/O     │ - Download as PPM/PNG                         │
└─────────────────┴───────────────────────────────────────────────┘
          ↓                          ↓
┌─────────────────────────────────────────────────────────────────┐
│            SHARED: Raytracer-Core.js + Modules                  │
│                                                                   │
│  Core Logic (100% identical in both environments)               │
│  - Geometry (sphere, cube, ray, etc.)                           │
│  - Materials & Patterns                                         │
│  - Lighting & Shading                                           │
│  - Transformations & World                                      │
│  - Scene Rendering                                              │
│  - PPM Conversion                                               │
└─────────────────────────────────────────────────────────────────┘
          ↓                          ↓
┌─────────────────────────────────────────────────────────────────┐
│         Platform-Specific Adapters (Minimal)                     │
│                                                                   │
│  CLI:     rtdt_objfile-node.js (fs module)                        │
│  Browser: rtdt_graphics.js (canvas drawing)                       │
│  Browser: raytracer-ui.js (DOM controls)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Layout

```
RTDT/
│
├── CLI Entry Point
│   ├── cli.js                      ← Main executable (executable bit set)
│   └── package.json                ← Node.js project config
│
├── Web Entry Point
│   └── webapp.html                 ← Single-file app (24KB, no deps)
│
├── Shared Core (100% identical code)
│   ├── raytracer-core.js           ← Platform-agnostic logic
│   ├── rtdt_math.js                  ← Math utilities
│   ├── rtdt_core.js                  ← Core structures (tuple, point, vector)
│   ├── rtdt_matrix.js                ← Matrix operations
│   ├── rtdt_matrix-transform.js      ← Transformations (translate, rotate, scale)
│   ├── rtdt_ray.js                   ← Ray tracing
│   ├── rtdt_light.js                 ← Light sources
│   ├── rtdt_material.js              ← Material properties
│   ├── rtdt_world.js                 ← World structure
│   ├── rtdt_shade.js                 ← Shading algorithms
│   ├── rtdt_p+e.js                   ← Primitives + Effects
│   ├── rtdt_pattern.js               ← Pattern textures
│   ├── rtdt_tests.js                 ← Test utilities
│   └── rtdt_examples.js              ← Scene definitions
│
├── Platform-Specific
│   ├── rtdt_objfile-node.js          ← OBJ loader (Node.js/fs)
│   ├── rtdt_graphics.js              ← Canvas rendering (Browser)
│   └── raytracer-ui.js             ← UI controls (Browser)
│
└── Documentation
    ├── CLI_README.md               ← Usage guide
    ├── REFACTORING_COMPLETE.md     ← Implementation notes
    └── ARCHITECTURE.md             ← This file
```

## Module Dependency Graph

```
1. rtdt_math.js
   └─ No dependencies

2. rtdt_core.js
   └─ Requires: rtdt_math

3. rtdt_matrix-transform.js
   └─ (Functions only, called later)

4. rtdt_matrix.js
   └─ Requires: rtdt_math, rtdt_core
   └─ References: multiply_matrix_by_tuple (from rtdt_matrix-transform)

5. rtdt_ray.js
   └─ Requires: rtdt_core

6. rtdt_light.js
   └─ Requires: rtdt_core

7. rtdt_material.js
   └─ Requires: rtdt_core

8. rtdt_world.js
   └─ Requires: rtdt_core, rtdt_material

9. rtdt_shade.js
   └─ Requires: rtdt_core, rtdt_material, rtdt_light, rtdt_ray

10. rtdt_p+e.js (Primitives + Effects)
    └─ Requires: rtdt_core, rtdt_matrix, rtdt_ray, rtdt_shade

11. rtdt_pattern.js
    └─ Requires: rtdt_core

12. rtdt_tests.js
    └─ Requires: rtdt_core

13. rtdt_examples.js (Scene definitions)
    └─ Requires: All of above

14. raytracer-core.js (Shared logic)
    └─ Requires: rtdt_examples.js (defines scenes)

15. rtdt_objfile-node.js (CLI only)
    └─ Requires: fs module

16. raytracer-ui.js (Browser only)
    └─ Requires: DOM access
```

## Loading Mechanisms

### CLI Loading (Node.js)

```javascript
// cli.js

const vm = require('vm');
const fs = require('fs');

function loadScript(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInThisContext(code);  // Executes in global scope
}

// Load modules in dependency order
loadScript('rtdt_math.js');
loadScript('rtdt_core.js');
// ... more modules ...
loadScript('raytracer-core.js');
```

**Why `vm.runInThisContext()`?**
- Ensures functions are in global scope
- Available to subsequently loaded modules
- Simpler than `require()` with modules
- No build step needed

### WebApp Loading (Browser)

```html
<!-- webapp.html -->

<script>
async function loadAllModules() {
  const MODULE_PATHS = [
    'rtdt_math.js',
    'rtdt_core.js',
    // ... more modules ...
    'raytracer-core.js'
  ];
  
  for (const path of MODULE_PATHS) {
    const response = await fetch(path);
    const code = await response.text();
    eval(code);  // Execute in global scope
  }
}

loadAllModules();
</script>

<!-- Optional: Can also load via <script> tags -->
<script src="rtdt_math.js"></script>
<script src="rtdt_core.js"></script>
<!-- ... etc ... -->
```

**Fallback Strategy:**
- Primary: Dynamic fetch + eval
- Secondary: Direct `<script>` tags (uncommented)
- Both result in global function availability

## Platform Differences

### Handling Browser-Only Code

Some modules contain browser-specific code that would fail in Node.js:

```javascript
// In scenes (rtdt_examples.js)
function scene1() {
  prepCanvas();    // Browser: initializes canvas
                   // CLI: no-op stub
  
  // ... scene setup ...
  
  renderImage();   // Browser: displays on canvas
                   // CLI: no-op stub
}
```

**Solution: Stub Functions**

CLI provides minimal stubs that satisfy the interface:

```javascript
// In cli.js
if (typeof prepCanvas === 'undefined') {
  global.prepCanvas = function() { /* no-op */ };
}
if (typeof renderImage === 'undefined') {
  global.renderImage = function() { /* no-op */ };
}
```

### File I/O

- **CLI**: Uses Node.js `fs` module → `rtdt_objfile-node.js`
- **Browser**: Uses HTML5 FileReader API → `rtdt_objfile.js`

### Rendering Output

- **CLI**: Synchronous render to PPM string → written to file
- **Browser**: Asynchronous render to pixel array → drawn to canvas

```javascript
// CLI
const pixels = renderSceneSync(world, camera, quality);
writePPMFile(filename, pixels);

// Browser
const pixels = renderSceneSync(world, camera, quality);
displayPixelsOnCanvas(pixels);
```

## Shared Code Principles

### ✓ What's Shared

- Geometry calculations (vectors, matrices)
- Material definitions
- Lighting equations
- Ray tracing algorithm
- Scene structure
- Coordinate transformations

### ✓ What's Isolated

- **CLI-only**: Argument parsing, PPM serialization, file I/O
- **Browser-only**: Canvas rendering, DOM manipulation, event listeners
- **Both**: Core scene rendering (identical implementation)

### ✓ Why This Works

1. **No Platform Checks**: Code doesn't check `typeof window`
2. **Interface Stubs**: Missing functions are stubbed as no-ops
3. **Same Logic**: Raytracer code is truly platform-agnostic
4. **Minimal Divergence**: Only render output format differs

## Data Flow

### CLI Rendering

```
Command Line Args
        ↓
Parse Arguments (cli.js)
        ↓
Load Scene Function (rtdt_examples.js)
        ↓
Initialize Raytracer
        ↓
Execute Scene Function
        ↓
renderSceneSync(world, camera, quality)
        ↓
Generate Pixel Array
        ↓
Convert to PPM Format
        ↓
Write to File
        ↓
Success Message
```

### Browser Rendering

```
User Selects Scene
        ↓
Fetch/Load Modules
        ↓
Load Scene Function (rtdt_examples.js)
        ↓
Initialize Raytracer
        ↓
User Adjusts Camera
        ↓
Click "Render"
        ↓
renderSceneSync(world, camera, quality)
        ↓
Generate Pixel Array
        ↓
Display on Canvas
        ↓
OR: Download as PPM/PNG
```

## Performance Characteristics

### Rendering Times

Both environments use identical rendering code, so times are comparable:

- Small (100x75): ~200-300ms
- Standard (500x281): ~1 second
- Large (800x600): ~2-3 seconds
- Extra Large (1200x900): ~8-10 seconds

Quality multiplier: Each increment roughly triples render time.

### Memory Usage

- Minimal: Scenes + objects + lighting
- Raytracer: ~10-50MB depending on scene complexity
- Pixel array: ~width × height × 4 bytes (for RGB + alpha)

### Bottlenecks

1. **Ray-object intersection**: Most expensive calculation
2. **Pixel iteration**: 500×281 = 140,500 iterations
3. **Floating-point math**: Heavy use of trigonometry
4. **Recursive reflection**: Deep recursion can blow stack

## Extensibility

### Adding a New Module

1. Create `rtdt_newmodule.js` with functions in global scope
2. Add to loading order (respect dependencies)
3. Use anywhere in scenes or core logic

### Adding a New Scene

1. Edit `rtdt_examples.js`
2. Add function: `function myScene() { ... }`
3. Add to `scenes` object in `cli.js`
4. Works in both CLI and browser automatically

### Adding CLI Features

1. Edit argument parsing in `cli.js`
2. Add to help text
3. Update implementation

### Adding Web UI Features

1. Edit `webapp.html`
2. Add HTML, CSS (inline), JavaScript
3. Wire up event listeners

## Constraints & Decisions

### Why No ES6 Modules?

- ✗ Would require build step
- ✗ Browser would need bundler
- ✓ Instead: Global scope with loading order

### Why No npm Dependencies?

- ✗ Would complicate web UI deployment
- ✗ CLI would have large footprint
- ✓ Instead: Vanilla Node.js + JavaScript

### Why Single HTML File?

- ✓ No server needed
- ✓ Easy to share/email
- ✓ Self-contained
- ✓ No external CDN dependencies

### Why PPM Output?

- ✓ Universal format
- ✓ Human-readable
- ✓ No external libraries needed
- ✗ Large file size (easily converted via ImageMagick)

## Future Architecture

If scaling beyond current scope, consider:

1. **Module System**: Switch to CommonJS/ES6 modules
2. **Build Step**: Webpack/Rollup for optimization
3. **Separate Repos**: CLI and web UI as separate projects
4. **Package Registry**: Publish to npm
5. **Web Worker**: Move rendering to background thread
6. **Streaming Render**: Progressive display as renderer works

## Conclusion

This architecture demonstrates:

- ✓ Clean separation of concerns
- ✓ Code reuse across platforms
- ✓ Minimal external dependencies
- ✓ Educational clarity (see all code)
- ✓ Practical performance (reasonable render times)

The design prioritizes **simplicity** and **understandability** while maintaining **functional completeness** in both environments.
