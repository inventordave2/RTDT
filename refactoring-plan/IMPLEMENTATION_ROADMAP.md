# Implementation Roadmap - Step by Step

## Ready to Build? Use This Checklist

This guide walks you through converting your raytracer to work with both browser and Node.js, using **zero build tools and no ES6 modules**.

---

## PHASE 1: Extract Browser UI (30 minutes)

### Task 1.1: Create raytracer-core.js
**File**: Copy raytracer.js → raytracer-core.js

**Keep** these items in raytracer-core.js:
- [x] `var CANVAS_WIDTH, HEIGHT`, `var WIDTH, HEIGHT`
- [x] `var RENDER_BG_COLOR`
- [x] `var Data = { ... }`
- [x] `var DataR = { ... }`
- [x] `function initRaytracer(width, height)`
- [x] `function generateBVH()`
- [x] `function renderSceneToPixels(world, camera, quality)`
- [x] `function renderSceneSync(world, camera, quality)` (NEW)
- [x] `function resetRenderingState()`
- [x] `function getScene(sceneName)`
- [x] `function colorTo255(c)`

**Remove** these from raytracer-core.js:
- [x] ALL DOM manipulation (`document.getElementById`, `querySelector`, etc.)
- [x] ALL canvas drawing (`ctx.fillStyle`, `ctx.fillRect`, etc.)
- [x] `function optionSelected()` - browser only
- [x] `function camPresetSelected()` - browser only
- [x] `function populateCameraMenu()` - browser only
- [x] `function selectLightColour()` - browser only (but keep logic)
- [x] All variable references to HTML elements

**Test**: Load in browser console:
```javascript
<script src="raytracer-core.js"></script>
// Should work, no errors
typeof initRaytracer        // "function"
typeof renderSceneSync      // "function"
```

---

### Task 1.2: Create raytracer-ui.js
**File**: Create NEW file raytracer-ui.js

**Add** to raytracer-ui.js:
- [x] Guard check: `if (typeof window === 'undefined') throw new Error(...)`
- [x] All DOM element references: `canvas`, `ctx`
- [x] `function optionSelected()` (FROM raytracer.js)
- [x] `function camPresetSelected()` (FROM raytracer.js)
- [x] `function sceneCameraBounds()` (FROM raytracer.js)
- [x] `function populateCameraMenu()` (FROM raytracer.js)
- [x] `function selectLightColour()` (FROM raytracer.js)
- [x] `function renderImage()` (NEW - calls renderSceneToPixels)
- [x] `function displayPixelsOnCanvas()` (NEW)
- [x] All event listener setup
- [x] All modal handlers

**Reference file**: See `raytracer-ui-EXAMPLE.js` in session files

**Test**: Load in browser
```html
<script src="raytracer-core.js"></script>
<script src="raytracer-ui.js"></script>
<!-- Should not error -->
```

---

### Task 1.3: Update raytracer.html
**File**: Modify raytracer.html

**Add** these lines in correct order (before closing `</head>` or `</body>`):
```html
<script src="raytracer-core.js"></script>
<script src="raytracer-ui.js"></script>
```

**Remove** or comment out:
- [x] Old inline scripts
- [x] Old function definitions
- [x] Any script that loads old raytracer.js

**Order must be** (already in your HTML, just verify):
1. rtdt_math.js
2. rtdt_core.js
3. rtdt_matrix.js
4. rtdt_matrix-transform.js
5. rtdt_ray.js
6. rtdt_light.js
7. rtdt_material.js
8. rtdt_world.js
9. rtdt_shade.js
10. rtdt_p+e.js
11. rtdt_pattern.js
12. rtdt_graphics.js
13. rtdt_objfile.js
14. rtdt_examples.js
15. **raytracer-core.js** ← NEW
16. **raytracer-ui.js** ← NEW

**Test**: Open raytracer.html in browser
- [x] No console errors
- [x] All buttons present
- [x] Rendering still works
- [x] UI interactions work

---

## PHASE 2: Add Node.js Infrastructure (45 minutes)

### Task 2.1: Create package.json
**File**: Create `package.json` in root directory

**Content**:
```json
{
  "name": "rtdt-raytracer",
  "version": "1.0.0",
  "description": "JavaScript Raytracer - Browser & CLI",
  "main": "cli.js",
  "bin": {
    "rtdt": "./cli-bootstrap.js"
  },
  "scripts": {
    "start": "node cli-bootstrap.js --help"
  },
  "engines": {
    "node": ">=12.0.0"
  }
}
```

**Reference file**: See `package-EXAMPLE.json` in session files

---

### Task 2.2: Create cli-bootstrap.js
**File**: Create `cli-bootstrap.js` in root directory

**Content**: Load all .js files in order
```javascript
#!/usr/bin/env node

// Load core modules
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

// Load shared logic
require('./raytracer-core.js');

// Load CLI
require('./cli.js');
```

**Make it executable**:
```bash
chmod +x cli-bootstrap.js
```

**Reference file**: See `cli-bootstrap-EXAMPLE.js` in session files

**Test**:
```bash
node cli-bootstrap.js --help
# Should NOT error, should show help
```

---

### Task 2.3: Create cli.js
**File**: Create `cli.js` in root directory

**Content**: Command-line interface
- [x] Guard check: `if (typeof window !== 'undefined') throw new Error(...)`
- [x] `function parseArguments()` - parse command line args
- [x] `function main()` - orchestrate rendering
- [x] `function writePPMFile(path, pixels, w, h)` - write PPM output
- [x] Error handling and help text

**Reference file**: See `cli-EXAMPLE.js` in session files (copy & modify)

**Test**:
```bash
node cli-bootstrap.js --help
# Should show help message

node cli-bootstrap.js --scene scene1 --output test.ppm
# Should create test.ppm file
```

---

### Task 2.4: Create rtdt_objfile-node.js
**File**: Create `rtdt_objfile-node.js` in root directory

**Content**: Node.js version of OBJ loader
```javascript
// OBJ loader for Node.js using fs module

var fs = require('fs');

function loadOBJFile(filePath, callback) {
    var data = fs.readFileSync(filePath, 'utf8');
    parseOBJData(data);
    if (callback) callback();
}

function parseOBJData(objString) {
    Data.v = [];
    Data.vn = [];
    Data.f = [];
    
    var lines = objString.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        
        if (line.startsWith('v ')) {
            var parts = line.split(/\s+/).slice(1);
            Data.v.push(vector(
                parseFloat(parts[0]),
                parseFloat(parts[1]),
                parseFloat(parts[2])
            ));
        }
        else if (line.startsWith('vn ')) {
            var parts = line.split(/\s+/).slice(1);
            Data.vn.push(vector(
                parseFloat(parts[0]),
                parseFloat(parts[1]),
                parseFloat(parts[2])
            ));
        }
        else if (line.startsWith('f ')) {
            Data.f.push(line);
        }
    }
    
    console.log("Loaded " + Data.v.length + " vertices, " + Data.f.length + " faces");
}
```

---

## PHASE 3: Refine and Polish (1 hour)

### Task 3.1: Test Both Platforms

**Browser Test**:
```bash
# 1. Open raytracer.html in browser
# 2. Open developer console (F12)
# 3. Verify no errors
# 4. Test rendering button
# 5. Test camera/light controls
# 6. Test OBJ file loading
```

**Node.js Test**:
```bash
# 1. Basic test
node cli-bootstrap.js --help

# 2. Render test
node cli-bootstrap.js --scene scene1 --output test.ppm

# 3. View output (if you have an image viewer)
open test.ppm  # or: display test.ppm

# 4. Custom size test
node cli-bootstrap.js --scene scene1 --width 800 --height 600 --output large.ppm
```

---

### Task 3.2: Clean Up Old Files

**Delete**:
- [x] Original `raytracer.js` (now split into -core.js and -ui.js)
- [x] Any backup files
- [x] Any commented-out code sections

---

### Task 3.3: Add Error Handling

**In cli.js, wrap main() in try-catch**:
```javascript
if (require.main === module) {
    try {
        main();
    } catch (e) {
        console.error("ERROR: " + e.message);
        if (e.stack) console.error(e.stack);
        process.exit(1);
    }
}
```

**In raytracer-ui.js, add error listeners**:
```javascript
window.onerror = function(msg, url, lineNo, colNo, error) {
    console.error("Error: " + msg);
    return false;
};
```

---

### Task 3.4: Add Documentation

**In cli.js**:
```javascript
function printHelp() {
    console.log("RTDT Raytracer - Command Line");
    console.log("");
    console.log("Usage: node cli-bootstrap.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  --scene, -s NAME    Load a predefined scene");
    console.log("  --output, -o FILE   Output PPM file");
    console.log("  --width, -w N       Image width");
    console.log("  --height, -h N      Image height");
    console.log("");
    console.log("Examples:");
    console.log("  node cli-bootstrap.js --scene scene1");
    console.log("  node cli-bootstrap.js -s scene1 -w 1024 -h 768 -o render.ppm");
}
```

---

## PHASE 4: Advanced Features (Optional, Future)

These can be added later once basic version works:

### Optional 4.1: Config File Support
```bash
# Create scene.yaml
scene: scene1
width: 1024
height: 768
samples: 4

# Use it
node cli-bootstrap.js --config scene.yaml --output render.ppm
```

### Optional 4.2: PNG Output
```bash
npm install sharp
# Then add PNG writer to cli.js
```

### Optional 4.3: Batch Rendering
```bash
# Render multiple scenes
node cli-bootstrap.js --batch scenes.json --output-dir ./renders
```

### Optional 4.4: Web Server
```bash
npm install express
# Serve both web UI and CLI via same API
```

---

## Checklist to Complete

### Phase 1: Extract UI ✓
- [ ] Created raytracer-core.js (pure logic, no DOM)
- [ ] Created raytracer-ui.js (browser UI only)
- [ ] Updated raytracer.html to load both files
- [ ] Browser still works exactly as before
- [ ] No console errors in browser

### Phase 2: Add Node.js ✓
- [ ] Created package.json
- [ ] Created cli-bootstrap.js
- [ ] Created cli.js
- [ ] Created rtdt_objfile-node.js
- [ ] `node cli-bootstrap.js --help` works
- [ ] `node cli-bootstrap.js --scene scene1 --output test.ppm` works
- [ ] test.ppm file is created and valid

### Phase 3: Polish ✓
- [ ] Both browser and CLI tested thoroughly
- [ ] Old raytracer.js deleted
- [ ] Error handling in place
- [ ] Help text clear and useful

### Phase 4: Share ✓
- [ ] Commit to git
- [ ] Test on another machine
- [ ] Document in README
- [ ] Share with collaborators

---

## Troubleshooting

### Browser shows "ReferenceError: X is not defined"
**Cause**: File loading order is wrong  
**Fix**: Check raytracer.html `<script>` order matches MODULE_LOAD_ORDER.md

### CLI shows "ReferenceError: X is not defined"
**Cause**: cli-bootstrap.js has wrong require() order  
**Fix**: Check cli-bootstrap.js order matches MODULE_LOAD_ORDER.md

### PPM file is empty
**Cause**: renderSceneSync didn't run or returned empty  
**Fix**: Check scene is loaded, camera is set

### PPM file won't open
**Cause**: Invalid PPM format  
**Fix**: Check writePPMFile() - ensure header is "P3\n"

### "fs is not defined" error in browser
**Cause**: Loading Node.js module in browser  
**Fix**: Make sure cli.js is NOT loaded in raytracer.html

### "window is not defined" error in Node.js
**Cause**: Loading browser module in Node.js  
**Fix**: Make sure raytracer-ui.js is NOT loaded in cli-bootstrap.js

---

## Success Indicators

You're done when:

✅ Browser version works (pixel-perfect same as original)
✅ CLI version renders to PPM file
✅ No console errors in either environment
✅ Can easily add features to both platforms
✅ No build step or transpilation needed
✅ Code is readable and maintainable
✅ Zero external dependencies (optional: add yargs for better CLI later)
