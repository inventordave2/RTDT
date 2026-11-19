# Node.js + Browser Universal JavaScript Architecture

## Strategy: No ES6 Modules, Global Namespace

This approach uses the classic JavaScript module pattern that works everywhere:
- **Browser**: Load scripts in `<script>` tags in correct order
- **Node.js**: Load files with `require()` in correct order
- **No changes needed**: Each file uses the same code

---

## File Loading Order (Critical!)

### Browser (in raytracer.html)
```html
<script src="rtdt_math.js"></script>
<script src="rtdt_core.js"></script>
<script src="rtdt_matrix.js"></script>
<script src="rtdt_matrix-transform.js"></script>
<script src="rtdt_ray.js"></script>
<script src="rtdt_light.js"></script>
<script src="rtdt_material.js"></script>
<script src="rtdt_world.js"></script>
<script src="rtdt_shade.js"></script>
<script src="rtdt_p+e.js"></script>
<script src="rtdt_pattern.js"></script>
<script src="rtdt_graphics.js"></script>  <!-- Browser-only -->
<script src="rtdt_objfile.js"></script>
<script src="raytracer-core.js"></script>  <!-- Shared logic -->
<script src="raytracer-ui.js"></script>    <!-- Browser-only -->
```

### Node.js (in cli-bootstrap.js)
```javascript
// Load in same order, using require()
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
require('./rtdt_objfile-node.js');  // Node.js version
require('./raytracer-core.js');   // Shared logic
require('./cli.js');               // CLI interface
```

---

## File Structure After Refactoring

```
RTDT/
├── raytracer.html                 ← Browser UI (unchanged basically)
├── package.json                   ← New: Node.js metadata
├── cli.js                          ← NEW: CLI entry point for Node.js
├── cli-bootstrap.js               ← NEW: Loads all files for Node.js
│
├── rtdt_math.js                      ← SHARED (no changes)
├── rtdt_core.js                      ← SHARED (no changes)
├── rtdt_matrix.js                    ← SHARED (no changes)
├── rtdt_matrix-transform.js          ← SHARED (no changes)
├── rtdt_ray.js                       ← SHARED (no changes)
├── rtdt_light.js                     ← SHARED (no changes)
├── rtdt_material.js                  ← SHARED (no changes)
├── rtdt_world.js                     ← SHARED (no changes)
├── rtdt_shade.js                     ← SHARED (no changes)
├── rtdt_p+e.js                       ← SHARED (no changes)
├── rtdt_pattern.js                   ← SHARED (no changes)
│
├── rtdt_graphics.js                  ← BROWSER-ONLY (canvas rendering)
├── raytracer-ui.js                 ← BROWSER-ONLY (new: extracted UI code)
│
├── rtdt_objfile.js                   ← BROWSER VERSION (FileReader)
├── rtdt_objfile-node.js              ← NODE.JS VERSION (fs module)
│
├── raytracer-core.js               ← NEW: Shared scene/render logic
├── raytracer-output.js             ← NEW: Output handlers (PPM, etc)
│
└── examples/
    ├── scene1.yaml                 ← Scene config files
    └── scene2.yaml
```

---

## How Global Namespace Works

### Each file contributes to global object

**rtdt_math.js** (no changes needed):
```javascript
// Adds functions to global scope
function equal(a, b) { /* ... */ }
function add(a, b) { /* ... */ }
// In Node.js: available as global.equal, global.add
// In Browser: available as window.equal, window.add
```

**rtdt_core.js** (no changes needed):
```javascript
function tuple(x, y, z, type) { /* ... */ }
// Uses: equal(), add() from rtdt_math.js
```

**Key rule**: Declare functions at file scope (not inside a function)
- In Node.js: automatically available globally
- In Browser: becomes `window.functionName`

### Why this works:

**Node.js**:
```javascript
// In Node.js, top-level declarations are in module scope, but we'll make them global
global.equal = function(a, b) { /* ... */ };
```

**Browser**:
```javascript
// In browser, top-level declarations are in window scope
window.equal = function(a, b) { /* ... */ };
// Can omit "window.", just use: equal(a, b)
```

---

## Refactoring Steps (Practical)

### Step 1: Extract Browser-Only Code

**Current**: `raytracer.js` is 50% UI code, 50% rendering

**Goal**: Split into two files

#### NEW: `raytracer-core.js` (SHARED - works in Node.js and browser)
```javascript
// Pure rendering logic, no DOM calls

var Data = {
    PPM: [],
    f: [],
    v: [],
    vn: [],
    vt: [],
    g: [],
    o: {},
    cache: {},
    c: new camera(WIDTH, HEIGHT, (Math.PI/4)),
    l: new point_light(point(-20, 20, 40), colour(1,1,1)),
    presets: { camera: [], lights: [], scenes: [] }
};

var DataR = {
    x_min: Infinity,
    x_max: -Infinity,
    y_min: Infinity,
    y_max: -Infinity,
    z_min: Infinity,
    z_max: -Infinity,
    f_begins: 0,
    v_begins: 0,
    vn_begins: 0,
    vt_begins: 0,
    divideValue: 100
};

// Rendering functions (no DOM calls)
function renderScene(scene, camera, light, outputPath) {
    // Pure logic
}

function generateBVH() {
    // Pure logic
}
```

#### NEW: `raytracer-ui.js` (BROWSER-ONLY - with DOM calls)
```javascript
// Browser UI code only

function optionSelected() {
    // DOM manipulation
    var ct;
    switch(document.getElementById("os").selectedIndex) {
        // ...
    }
}

function camPresetSelected() {
    // DOM manipulation
}

function populateCameraMenu() {
    // DOM manipulation
}

// All other browser-specific code
```

#### In `raytracer.html`:
```html
<script src="raytracer-core.js"></script>   <!-- Loads in both contexts -->
<script src="raytracer-ui.js"></script>     <!-- Only in browser -->
```

### Step 2: Create Node.js Version of OBJ Loader

#### Current: `rtdt_objfile.js` (BROWSER - uses FileReader)
Keep this as-is for browser

#### NEW: `rtdt_objfile-node.js` (NODE.JS - uses fs module)
```javascript
// This file replaces rtdt_objfile.js in Node.js environment

function loadOBJFile(filePath, callback) {
    var fs = require('fs');
    
    fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) {
            throw new Error("Could not load OBJ file: " + filePath);
        }
        
        // Parse OBJ data (same parsing logic as browser version)
        parseOBJData(data);
        
        if (callback) callback();
    });
}
```

### Step 3: Create Node.js Entry Point

#### NEW: `cli-bootstrap.js`
```javascript
#!/usr/bin/env node

// Load all modules in order
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
require('./rtdt_objfile-node.js');      // Node.js version
require('./raytracer-core.js');        // Shared rendering
require('./raytracer-output.js');      // Output handlers
require('./cli.js');                   // CLI interface
```

#### NEW: `cli.js` (CLI Interface)
```javascript
// Handles command-line arguments and orchestrates rendering

var yargs = require('yargs');
var fs = require('fs');
var path = require('path');

// Parse arguments
var argv = yargs
    .option('scene', {
        alias: 's',
        describe: 'Scene name or function',
        type: 'string'
    })
    .option('output', {
        alias: 'o',
        describe: 'Output file path (PPM format)',
        type: 'string',
        default: 'render.ppm'
    })
    .option('width', {
        alias: 'w',
        describe: 'Image width',
        type: 'number',
        default: 500
    })
    .option('height', {
        alias: 'h',
        describe: 'Image height',
        type: 'number',
        default: 281
    })
    .option('samples', {
        describe: 'Samples per pixel (for anti-aliasing)',
        type: 'number',
        default: 1
    })
    .option('config', {
        alias: 'c',
        describe: 'Config file (YAML or JSON)',
        type: 'string'
    })
    .help()
    .argv;

// Load scene configuration
function loadSceneConfig(configPath) {
    // Parse YAML or JSON
}

function main() {
    console.log('RTDT Raytracer - CLI');
    console.log('Rendering scene...');
    
    // Create scene
    var scene;
    if (argv.config) {
        scene = loadSceneConfig(argv.config);
    } else if (argv.scene) {
        scene = getSceneByName(argv.scene);
    } else {
        console.error('Must specify --scene or --config');
        process.exit(1);
    }
    
    // Update canvas dimensions
    WIDTH = argv.width;
    HEIGHT = argv.height;
    
    // Render
    var output = renderScene(scene, argv.samples);
    
    // Write output
    writePPMFile(argv.output, output, WIDTH, HEIGHT);
    
    console.log('Rendered to: ' + argv.output);
}

// Only run if executed directly
if (require.main === module) {
    main();
}
```

#### NEW: `raytracer-output.js` (Output Handlers)
```javascript
// Handles writing PPM and other formats

function writePPMFile(filePath, pixels, width, height) {
    var fs = require('fs');
    
    // PPM format: P3 (ASCII) or P6 (binary)
    var ppmHeader = 'P3\n' + width + ' ' + height + '\n255\n';
    var ppmData = ppmHeader;
    
    // Convert pixel array to PPM format
    for (var i = 0; i < pixels.length; i++) {
        var r = Math.floor(pixels[i].r * 255);
        var g = Math.floor(pixels[i].g * 255);
        var b = Math.floor(pixels[i].b * 255);
        
        ppmData += r + ' ' + g + ' ' + b + '\n';
    }
    
    fs.writeFileSync(filePath, ppmData);
}
```

#### NEW: `package.json`
```json
{
  "name": "rtdt-raytracer",
  "version": "1.0.0",
  "description": "JavaScript Raytracer Challenge - Browser and CLI",
  "main": "cli.js",
  "bin": {
    "rtdt": "cli-bootstrap.js"
  },
  "scripts": {
    "start": "node cli-bootstrap.js",
    "test": "node test.js"
  },
  "dependencies": {
    "yargs": "^17.0.0"
  },
  "devDependencies": {},
  "engines": {
    "node": ">=12.0.0"
  }
}
```

### Step 4: Usage Examples

#### Browser (unchanged):
```html
<!DOCTYPE html>
<head>
    <script src="rtdt_math.js"></script>
    <!-- ... all other rtdt_*.js files ... -->
    <script src="raytracer-core.js"></script>
    <script src="raytracer-ui.js"></script>
</head>
<body>
    <!-- Existing UI unchanged -->
</body>
</html>
```

#### Node.js CLI:
```bash
# Install dependencies
npm install

# Render a scene
node cli-bootstrap.js --scene scene1 --output render.ppm

# Render with custom size
node cli-bootstrap.js --scene scene1 --width 1024 --height 768 --output large.ppm

# Render from config file
node cli-bootstrap.js --config scene.yaml --output render.ppm

# Once installed globally:
npm install -g .
rtdt --scene scene1 --output render.ppm
```

---

## Key Principles for Universal Code

### ✅ DO:
```javascript
// Top-level function declarations (works everywhere)
function myFunction() { }

// Top-level variables (works everywhere)
var myVar = 123;

// Conditional logic
if (typeof window !== 'undefined') {
    // Browser-specific code
} else {
    // Node.js specific code
}

// Check for module
if (typeof module !== 'undefined' && module.exports) {
    // Node.js specific setup
}
```

### ❌ DON'T:
```javascript
// Import/export (doesn't work in browser without build step)
import { something } from './file.js';
export function myFunction() { }

// Require without conditional (doesn't work in browser)
var fs = require('fs');  // WRONG - browser doesn't have fs

// Window-only code (doesn't work in Node.js)
window.myVar = 123;      // WRONG - Node.js has no window

// Process-only code (doesn't work in browser)
process.env.PATH;        // WRONG - browser has no process
```

### ✅ DO (Conditional):
```javascript
// Correct way for browser/Node.js split
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    // This is Node.js
    var fs = require('fs');
    function loadFile(path) {
        return fs.readFileSync(path, 'utf8');
    }
} else {
    // This is browser
    function loadFile(url) {
        // Use fetch or XMLHttpRequest
    }
}
```

---

## Summary: What Changes, What Doesn't

### NO Changes Needed:
- ✅ `rtdt_math.js` - Pure math
- ✅ `rtdt_core.js` - Pure rendering logic
- ✅ `rtdt_matrix.js` - Pure math
- ✅ `rtdt_matrix-transform.js` - Pure math
- ✅ `rtdt_ray.js` - Pure logic
- ✅ `rtdt_light.js` - Pure definitions
- ✅ `rtdt_material.js` - Pure definitions
- ✅ `rtdt_world.js` - Pure logic
- ✅ `rtdt_shade.js` - Pure math
- ✅ `rtdt_p+e.js` - Pure geometry
- ✅ `rtdt_pattern.js` - Pure logic
- ✅ `raytracer.html` - Keep as-is

### MINOR Changes:
- ⚠️ `rtdt_graphics.js` - Wrap canvas code in `if (typeof window !== 'undefined') { ... }`
- ⚠️ `rtdt_objfile.js` - Wrap FileReader in conditional, add Node.js version

### SPLIT Files:
- 📝 `raytracer.js` → Split into `raytracer-core.js` + `raytracer-ui.js`

### NEW Files:
- 🆕 `rtdt_objfile-node.js` - Node.js OBJ loader
- 🆕 `cli-bootstrap.js` - Node.js entry point
- 🆕 `cli.js` - CLI command handler
- 🆕 `raytracer-output.js` - Output formatters
- 🆕 `package.json` - Node.js metadata

---

## Migration Path (Incremental)

### Week 1: Foundation
1. Create `raytracer-core.js` with non-UI code
2. Create `raytracer-ui.js` with browser code
3. Update `raytracer.html` to load both
4. Test browser still works

### Week 2: Node.js Infrastructure
1. Create `package.json`
2. Create `cli-bootstrap.js` to load all files
3. Create `rtdt_objfile-node.js`
4. Create `cli.js` with basic rendering

### Week 3: Output & Polish
1. Create `raytracer-output.js` for PPM/PNG output
2. Add command-line arg parsing
3. Test CLI rendering
4. Add config file support

### Week 4: Testing & Optimization
1. Add unit tests
2. Performance testing
3. Documentation
4. Release v1.0

---

## No Bundlers, No Build Steps

**Why this approach is better:**
- ✅ Works immediately in any browser (no build needed)
- ✅ Works in Node.js with `require()` (no transpilation needed)
- ✅ Edit file, refresh browser or rerun Node (instant feedback)
- ✅ No dependency on webpack, babel, or other tools
- ✅ Easy to debug (source files are directly used)
- ✅ Trivial to contribute to (just edit .js files)

**Trade-offs:**
- ⚠️ Must manually manage load order (critical!)
- ⚠️ Global namespace pollution (but isolated to this project)
- ⚠️ No tree-shaking (but these files are small)

