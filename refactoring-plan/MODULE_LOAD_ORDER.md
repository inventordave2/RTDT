# Module Dependency Graph & Load Order

## Critical: Script Load Order MUST Be Correct

Each file can only use functions/variables defined in files loaded BEFORE it.

```
BROWSER PATH:
==============
raytracer.html loads:

  1. rt.math.js
     ↓ (depends on: nothing)
     
  2. rt.core.js  
     ↓ (depends on: rt.math)
     
  3. rt.matrix.js
     ↓ (depends on: rt.math, rt.core)
     
  4. rt.matrix-transform.js
     ↓ (depends on: rt.matrix)
     
  5. rt.ray.js
     ↓ (depends on: rt.core)
     
  6. rt.light.js
     ↓ (depends on: rt.core)
     
  7. rt.material.js
     ↓ (depends on: rt.core)
     
  8. rt.world.js
     ↓ (depends on: rt.core, rt.material)
     
  9. rt.shade.js
     ↓ (depends on: rt.core, rt.material, rt.light)
     
 10. rt.p+e.js (Primitives + Effects)
     ↓ (depends on: rt.core, rt.matrix, rt.ray, rt.shade)
     
 11. rt.pattern.js
     ↓ (depends on: rt.core)
     
 12. rt.graphics.js
     ↓ (depends on: rt.core, HTML canvas)
     ↓ BROWSER ONLY!
     
 13. rt.objfile.js
     ↓ (depends on: rt.core, FileReader API)
     ↓ BROWSER ONLY!
     
 14. rt.examples.js
     ↓ (depends on: All above, creates scenes)
     
 15. raytracer-core.js
     ↓ (depends on: All above, NO DOM)
     ↓ SHARED - WORKS IN BROWSER AND NODE.JS
     
 16. raytracer-ui.js
     ↓ (depends on: raytracer-core, DOM elements)
     ↓ BROWSER ONLY!


NODE.JS PATH:
==============
cli-bootstrap.js requires:

  Same as above (steps 1-14) but SKIPS rt.graphics.js
  
 15. raytracer-core.js
     ↓ SHARED - works in Node.js
     
 16. rt.objfile-node.js
     ↓ NODE.JS VERSION using fs module
     ↓ (depends on: rt.core, fs)
     
 17. cli.js
     ↓ (depends on: raytracer-core, fs, process)
     ↓ NODE.JS ONLY!
```

---

## Dependency Details

### Level 0: No Dependencies (Load First)
```
rt.math.js
  - equal(), add(), subtract(), multiply(), divide()
  - negate(), magnitude(), normalize()
  - Uses: Nothing else
  - Safe to load first
```

### Level 1: Depends on rt.math
```
rt.core.js
  - tuple(), point(), vector()
  - dot(), cross()
  - color()
  - Uses: rt.math functions
  
rt.light.js
  - point_light()
  - Uses: tuple, point, vector, colour
```

### Level 2: Depends on Level 0-1
```
rt.matrix.js
  - Matrix operations
  - Uses: rt.math, rt.core
  
rt.ray.js
  - ray class
  - Uses: tuple, point, vector
  
rt.material.js
  - material class
  - Uses: tuple, colour
```

### Level 3: Depends on Level 0-2
```
rt.matrix-transform.js
  - Transformation matrices
  - Uses: rt.matrix, rt.core
  
rt.world.js
  - world class
  - Uses: ray, sphere, etc.
  
rt.shade.js
  - Phong shading
  - Uses: rt.core, rt.light, rt.material
```

### Level 4: Depends on Level 0-3
```
rt.p+e.js (Primitives + Effects)
  - Sphere, plane, cube, cylinder, triangle, group
  - Uses: Everything above
  
rt.pattern.js
  - Stripe, checkerboard patterns
  - Uses: rt.core
```

### Level 5: Platform-Specific
```
BROWSER:
  rt.graphics.js
    - Canvas drawing
    - Uses: ctx (canvas context), rt.core
    
  rt.objfile.js
    - OBJ file loading via FileReader
    - Uses: FileReader API, parsing logic

NODE.JS:
  rt.objfile-node.js
    - OBJ file loading via fs
    - Uses: fs module, parsing logic
```

### Level 6: Shared Logic (Both Platforms)
```
raytracer-core.js
  - initRaytracer()
  - renderSceneSync(), renderSceneToPixels()
  - Pure rendering logic (no DOM, no fs)
  - Uses: Everything above EXCEPT platform-specific code
  
rt.examples.js
  - Scene definitions
  - Uses: All rendering modules
```

### Level 7: Platform-Specific UI
```
BROWSER:
  raytracer-ui.js
    - optionSelected(), camPresetSelected()
    - populateCameraMenu(), renderImage()
    - All DOM manipulation
    - Uses: raytracer-core, DOM APIs

NODE.JS:
  cli.js
    - parseArguments(), loadConfigFile()
    - writePPMFile(), main()
    - All CLI logic
    - Uses: raytracer-core, fs, process
```

---

## How to Get Dependencies Right

### Method 1: Manual Check (Recommended)
Before loading file.js, verify:
- Every function it calls exists in a file loaded before it
- Every variable it uses is declared in a previous file

### Method 2: Runtime Test
```javascript
// In browser console, after loading a file:
typeof myFunction;        // Should be "function" not "undefined"

// In Node.js after requiring:
typeof myFunction;        // Should be "function" not "undefined"
```

### Method 3: Grep Check
```bash
# Find all function calls in rt.ray.js
grep -oE '[a-zA-Z_][a-zA-Z0-9_]*\(' rt.ray.js | sort -u

# Then verify each is defined in earlier files
grep "function dot\|function cross\|function normalize" rt.math.js rt.core.js
```

---

## Common Mistakes

### ❌ Loading in Wrong Order
```javascript
<!-- WRONG: ray.js before core.js -->
<script src="rt.ray.js"></script>
<script src="rt.core.js"></script>
<!-- Result: ReferenceError: vector is not defined -->
```

### ❌ Skipping a File
```javascript
// WRONG: Skip rt.light.js
require('./rt.material.js');
require('./rt.shade.js');  // ERROR: point_light not defined
```

### ✅ Correct Order
```javascript
// RIGHT: Load in dependency order
<script src="rt.math.js"></script>       // 1
<script src="rt.core.js"></script>       // 2
<script src="rt.light.js"></script>      // 3 (needs core)
<script src="rt.material.js"></script>   // 4
<script src="rt.shade.js"></script>      // 5 (needs light + material)
```

---

## Adding New Files to the Pipeline

### New core module (e.g., rt.animation.js)
1. Add after the modules it depends on
2. Load in both browser and Node.js

### New browser feature (e.g., raytracer-export.js)
1. Add after raytracer-core.js
2. Load ONLY in raytracer.html
3. Use guard: `if (typeof window === 'undefined') throw new Error(...)`

### New Node.js feature (e.g., cli-config-parser.js)
1. Add after raytracer-core.js
2. Load ONLY in cli-bootstrap.js
3. Use guard: `if (typeof window !== 'undefined') throw new Error(...)`

---

## Quick Reference: What Each File Exports

| File | Main Exports | Type |
|------|--------------|------|
| rt.math.js | equal(), add(), subtract(), multiply() | Pure Math |
| rt.core.js | tuple(), point(), vector(), dot(), cross() | Core Types |
| rt.matrix.js | m_multiply(), transpose(), identity_matrix() | Linear Algebra |
| rt.matrix-transform.js | translation(), scaling(), rotation() | Transforms |
| rt.ray.js | ray class | Ray Casting |
| rt.light.js | point_light class | Lighting |
| rt.material.js | material class | Materials |
| rt.world.js | world class | Scene Management |
| rt.shade.js | lighting() | Shading |
| rt.p+e.js | sphere, plane, cube, cylinder, group | Primitives |
| rt.pattern.js | stripe_pattern, checkerboard_pattern | Patterns |
| rt.graphics.js | Canvas drawing functions | Browser Only |
| rt.objfile.js | loadOBJFile() (FileReader) | Browser Only |
| rt.objfile-node.js | loadOBJFile() (fs) | Node.js Only |
| rt.examples.js | scene1(), scene2(), scene3() | Examples |
| raytracer-core.js | initRaytracer(), renderSceneSync() | SHARED |
| raytracer-ui.js | optionSelected(), renderImage() | Browser Only |
| cli.js | main(), parseArguments() | Node.js Only |

---

## Verifying Load Order Works

### Browser Test:
```javascript
// Open console in browser
// If all scripts loaded correctly:
typeof sphere        // "function"
typeof camera        // "function"
typeof renderImage   // "function"
typeof fs            // "undefined" (good, it's Node.js only)
```

### Node.js Test:
```bash
node cli-bootstrap.js

# If all files loaded correctly:
# Should see: "Modules loaded. Ready for rendering."
# And no ReferenceError messages
```

---

## Summary

**The golden rule**: A file can only use things defined in files loaded BEFORE it.

**Browser**: HTML file controls load order via `<script>` tags
**Node.js**: cli-bootstrap.js controls load order via `require()`

Both use the SAME underlying files, just different load orders.
No file should import/require - they all assume globals are already present.
