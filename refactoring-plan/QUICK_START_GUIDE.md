# Universal JavaScript Architecture - Quick Start

## Your Request ✅
"I want my JavaScript to work with Node.js but also trivially with browsers using an HTML UI frontend, no 'import' or any of that crap"

**Solution**: Use classic global functions + script tags. NO ES6 modules. Works everywhere.

---

## TL;DR - How to Convert Your App

### Phase 1: Minimal Changes (~1-2 hours)
1. **Extract browser-only code** from `raytracer.js` → new file `raytracer-ui.js`
2. **Keep pure logic** in new file `raytracer-core.js`
3. **Update HTML** script loading order
4. **Test browser** - should work exactly as before

### Phase 2: Add Node.js (~2-3 hours)
1. Create `cli-bootstrap.js` - just loads all .js files
2. Create `cli.js` - handles command-line arguments
3. Create `package.json`
4. Create Node.js version of OBJ loader
5. Test: `node cli-bootstrap.js --scene scene1 --output render.ppm`

### Phase 3: Refine (~1-2 hours)
1. Add PPM file output support
2. Add config file loading (JSON/YAML)
3. Add error handling and validation
4. Polish help text

**Total Effort: 4-7 hours for experienced JS developer**

---

## File Structure After Refactoring

```
RTDT/
├── raytracer.html              ← NO CHANGES NEEDED (mostly)
├── package.json                ← NEW: For Node.js
├── cli-bootstrap.js            ← NEW: Entry for Node.js
├── cli.js                       ← NEW: CLI handler
│
├── rtdt_math.js                  ← NO CHANGES
├── rtdt_core.js                  ← NO CHANGES
├── (all other rtdt_*.js files)   ← NO CHANGES
│
├── raytracer-core.js           ← NEW: Extracted from raytracer.js (shared)
├── raytracer-ui.js             ← NEW: Extracted from raytracer.js (browser only)
└── rtdt_objfile-node.js          ← NEW: Node.js OBJ loader
```

---

## Browser Usage (Unchanged)

```html
<!-- In raytracer.html - just add scripts in order -->
<script src="rtdt_math.js"></script>
<script src="rtdt_core.js"></script>
<!-- ... all other rtdt_*.js files ... -->
<script src="raytracer-core.js"></script>   ← NEW: Shared logic
<script src="raytracer-ui.js"></script>     ← NEW: Browser UI only
```

**Result**: Browser works exactly as before. No changes needed.

---

## Node.js CLI Usage

```bash
# Install (one time)
npm install

# Render a scene
node cli-bootstrap.js --scene scene1 --output render.ppm

# Render with custom size
node cli-bootstrap.js --scene scene1 --width 1024 --height 768 --output large.ppm

# Render from config file
node cli-bootstrap.js --config scene.yaml --output render.ppm

# View help
node cli-bootstrap.js --help
```

---

## Key Principles: No ES6 Modules

### ✅ This Works Everywhere:
```javascript
// In any .js file, just declare at top level
function myFunction() {
  // works in browser as window.myFunction
  // works in Node.js as global.myFunction
}

var myVariable = 123;
// works in browser as window.myVariable
// works in Node.js as global.myVariable
```

### ✅ This Also Works:
```javascript
// Detect environment when needed
if (typeof window !== 'undefined') {
    // We're in a browser
    console.log("Browser mode");
} else {
    // We're in Node.js
    var fs = require('fs');
    console.log("Node.js mode");
}
```

### ❌ Don't Do This:
```javascript
// ES6 modules - doesn't work in browsers without build tools
import { something } from './file.js';
export function myFunction() { }

// Require unconditionally - fails in browser
var fs = require('fs');  // Error: fs is not defined

// Window-only APIs - fail in Node.js
window.myVar = 123;  // Error: window is not defined
```

---

## Why This Approach is Perfect for You

✅ **Works immediately** - no build step, no webpack, no babel
✅ **Browser-friendly** - load .js files, run instantly
✅ **Node.js-friendly** - require() files in correct order
✅ **Easy debugging** - browser DevTools and Node.js debugger work
✅ **Trivial to contribute** - just edit .js files
✅ **Already using this pattern** - your existing code already works this way

⚠️ **Trade-offs**:
- Must manually manage script load order (document it!)
- Global namespace pollution (but only this project)
- No tree-shaking (files are small anyway)

---

## Code Examples

### Example 1: raytracer-core.js (SHARED)
```javascript
// Works in BOTH browser and Node.js
// No DOM calls, no fs calls, no require() statements

var WIDTH = 500, HEIGHT = 281;
var Data = { /* ... */ };

function initRaytracer(width, height) {
    WIDTH = width;
    HEIGHT = height;
    Data.c = new camera(WIDTH, HEIGHT, Math.PI/4);
}

function renderSceneSync(world, camera) {
    var pixels = [];
    for (var y = 0; y < HEIGHT; y++) {
        for (var x = 0; x < WIDTH; x++) {
            var ray = camera.ray_for_pixel(x, y);
            var color = color_at(world, ray, 1);
            pixels.push(color);
        }
    }
    return pixels;
}
```

### Example 2: raytracer-ui.js (BROWSER ONLY)
```javascript
// ONLY loaded in browser, has DOM calls
// Removed: NO export/import, just top-level functions

if (typeof window === 'undefined') {
    throw new Error("raytracer-ui.js is browser-only!");
}

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

function renderImage() {
    var world = new world();
    world.light = Data.l;
    
    var pixels = renderSceneToPixels(world, Data.c, 1);
    
    // Display on canvas
    for (var i = 0; i < pixels.length; i++) {
        // ... canvas drawing code ...
    }
}

function optionSelected() {
    // DOM manipulation
    var option = document.getElementById('os').selectedIndex;
    // ...
}
```

### Example 3: cli.js (NODE.JS ONLY)
```javascript
// ONLY runs in Node.js, uses fs and process
// Removed: NO export/import, just top-level functions

if (typeof window !== 'undefined') {
    throw new Error("cli.js is Node.js-only!");
}

var fs = require('fs');
var path = require('path');

function main() {
    var argv = parseArguments();
    
    initRaytracer(argv.width, argv.height);
    
    var world = getScene(argv.scene);
    var pixels = renderSceneSync(world, Data.c, argv.samples);
    
    writePPMFile(argv.output, pixels, argv.width, argv.height);
}

function writePPMFile(filePath, pixels, width, height) {
    var ppmData = "P3\n" + width + " " + height + "\n255\n";
    
    for (var i = 0; i < pixels.length; i++) {
        var rgb = colorTo255(pixels[i]);
        ppmData += rgb.r + " " + rgb.g + " " + rgb.b + "\n";
    }
    
    fs.writeFileSync(filePath, ppmData);
}

if (require.main === module) {
    main();
}
```

### Example 4: cli-bootstrap.js (NODE.JS ENTRY)
```javascript
#!/usr/bin/env node

// Just load all files in correct order
require('./rtdt_math.js');
require('./rtdt_core.js');
require('./rtdt_matrix.js');
require('./rtdt_matrix-transform.js');
require('./rtdt_ray.js');
require('./rtdt_light.js');
require('./rtdt_material.js');
require('./rtdt_world.js');
require('./rtdt_shade.js');
require('./rtdt_p+e.js');
require('./rtdt_pattern.js');
require('./rtdt_objfile-node.js');
require('./rtdt_examples.js');
require('./raytracer-core.js');
require('./cli.js');
```

---

## Testing Checklist

### Browser ✅
- [ ] Open raytracer.html in browser
- [ ] All buttons work
- [ ] Camera/light controls work
- [ ] Rendering produces output
- [ ] OBJ file loading works
- [ ] Check console for errors

### Node.js ✅
- [ ] `node cli-bootstrap.js --help` shows help
- [ ] `node cli-bootstrap.js --scene scene1 --output test.ppm` creates PPM file
- [ ] PPM file opens in image viewer
- [ ] Custom sizes work: `--width 1024 --height 768`
- [ ] Config file loading works
- [ ] Error messages are helpful

---

## Adding New Features (Both Platforms)

### To add a new rendering feature:
1. Add function to `rtdt_*.js` file (pure math)
2. Use it in `raytracer-core.js` (shared logic)
3. Exposed automatically in both browser and CLI
4. No changes to HTML or cli-bootstrap.js needed

### To add browser-only feature:
1. Add function to `raytracer-ui.js`
2. Add DOM element to `raytracer.html`
3. Wire up event handlers in `raytracer-ui.js`

### To add Node.js-only feature:
1. Add function to `cli.js`
2. Add command-line option to argument parser
3. Use in `main()` function

---

## Zero Dependencies (Start Simple)

You don't need any npm packages to startdt_ All pure JavaScript.

When you want to add features later:
- **CLI argument parsing**: Use `yargs` (small, popular)
- **YAML config files**: Use `js-yaml` (small, pure JS)
- **PNG output**: Use `sharp` or `jimp` (but PPM is fine for now)
- **Image display**: View PPM in any viewer, or add a simple web server

---

## Summary

Your current JavaScript works great. Just:
1. Split UI code from rendering logic
2. Add 3 new files (`cli-bootstrap.js`, `cli.js`, `package.json`)
3. Create Node.js OBJ loader
4. Test both platforms

**No rebuild, no transpilation, no complicated tooling.**

Everything runs immediately in both environments, exactly as your code is written.

This is the cleanest, simplest approach for a dual-platform JavaScript app.
