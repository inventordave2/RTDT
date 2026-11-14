# Module Dependency Graph & Load Order

## Critical: Script Load Order MUST Be Correct

Each file can only use functions/variables defined in files loaded BEFORE it.

```
BROWSER PATH:
==============
raytracer.html loads:

  1. rtdt_math.js
     ↓ (depends on: nothing)
     
  2. rtdt_core.js  
     ↓ (depends on: rtdt_math)
     
  3. rtdt_matrix.js
     ↓ (depends on: rtdt_math, rtdt_core)
     
  4. rtdt_matrix-transform.js
     ↓ (depends on: rtdt_matrix)
     
  5. rtdt_ray.js
     ↓ (depends on: rtdt_core)
     
  6. rtdt_light.js
     ↓ (depends on: rtdt_core)
     
  7. rtdt_material.js
     ↓ (depends on: rtdt_core)
     
  8. rtdt_world.js
     ↓ (depends on: rtdt_core, rtdt_material)
     
  9. rtdt_shade.js
     ↓ (depends on: rtdt_core, rtdt_material, rtdt_light)
     
 10. rtdt_p+e.js (Primitives + Effects)
     ↓ (depends on: rtdt_core, rtdt_matrix, rtdt_ray, rtdt_shade)
     
 11. rtdt_pattern.js
     ↓ (depends on: rtdt_core)
     
 12. rtdt_graphics.js
     ↓ (depends on: rtdt_core, HTML canvas)
     ↓ BROWSER ONLY!
     
 13. rtdt_objfile.js
     ↓ (depends on: rtdt_core, FileReader API)
     ↓ BROWSER ONLY!
     
 14. rtdt_examples.js
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

  Same as above (steps 1-14) but SKIPS rtdt_graphics.js
  
 15. raytracer-core.js
     ↓ SHARED - works in Node.js
     
 16. rtdt_objfile-node.js
     ↓ NODE.JS VERSION using fs module
     ↓ (depends on: rtdt_core, fs)
     
 17. cli.js
     ↓ (depends on: raytracer-core, fs, process)
     ↓ NODE.JS ONLY!
```

---

## Dependency Details

### Level 0: No Dependencies (Load First)
```
rtdt_math.js
  - equal(), add(), subtract(), multiply(), divide()
  - negate(), magnitude(), normalize()
  - Uses: Nothing else
  - Safe to load first
```

### Level 1: Depends on rtdt_math
```
rtdt_core.js
  - tuple(), point(), vector()
  - dot(), cross()
  - color()
  - Uses: rtdt_math functions
  
rtdt_light.js
  - point_light()
  - Uses: tuple, point, vector, colour
```

### Level 2: Depends on Level 0-1
```
rtdt_matrix.js
  - Matrix operations
  - Uses: rtdt_math, rtdt_core
  
rtdt_ray.js
  - ray class
  - Uses: tuple, point, vector
  
rtdt_material.js
  - material class
  - Uses: tuple, colour
```

### Level 3: Depends on Level 0-2
```
rtdt_matrix-transform.js
  - Transformation matrices
  - Uses: rtdt_matrix, rtdt_core
  
rtdt_world.js
  - world class
  - Uses: ray, sphere, etc.
  
rtdt_shade.js
  - Phong shading
  - Uses: rtdt_core, rtdt_light, rtdt_material
```

### Level 4: Depends on Level 0-3
```
rtdt_p+e.js (Primitives + Effects)
  - Sphere, plane, cube, cylinder, triangle, group
  - Uses: Everything above
  
rtdt_pattern.js
  - Stripe, checkerboard patterns
  - Uses: rtdt_core
```

### Level 5: Platform-Specific
```
BROWSER:
  rtdt_graphics.js
    - Canvas drawing
    - Uses: ctx (canvas context), rtdt_core
    
  rtdt_objfile.js
    - OBJ file loading via FileReader
    - Uses: FileReader API, parsing logic

NODE.JS:
  rtdt_objfile-node.js
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
  
rtdt_examples.js
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
# Find all function calls in rtdt_ray.js
grep -oE '[a-zA-Z_][a-zA-Z0-9_]*\(' rtdt_ray.js | sort -u

# Then verify each is defined in earlier files
grep "function dot\|function cross\|function normalize" rtdt_math.js rtdt_core.js
```

---

## Common Mistakes

### ❌ Loading in Wrong Order
```javascript
<!-- WRONG: ray.js before core.js -->
<script src="rtdt_ray.js"></script>
<script src="rtdt_core.js"></script>
<!-- Result: ReferenceError: vector is not defined -->
```

### ❌ Skipping a File
```javascript
// WRONG: Skip rtdt_light.js
require('./rtdt_material.js');
require('./rtdt_shade.js');  // ERROR: point_light not defined
```

### ✅ Correct Order
```javascript
// RIGHT: Load in dependency order
<script src="rtdt_math.js"></script>       // 1
<script src="rtdt_core.js"></script>       // 2
<script src="rtdt_light.js"></script>      // 3 (needs core)
<script src="rtdt_material.js"></script>   // 4
<script src="rtdt_shade.js"></script>      // 5 (needs light + material)
```

---

## Adding New Files to the Pipeline

### New core module (e.g., rtdt_animation.js)
1. Add after the modules it depends on
2. Load in both browser and Node.js

### New browser feature (e.g., raytracer-exportdt_js)
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
| rtdt_math.js | equal(), add(), subtract(), multiply() | Pure Math |
| rtdt_core.js | tuple(), point(), vector(), dot(), cross() | Core Types |
| rtdt_matrix.js | m_multiply(), transpose(), identity_matrix() | Linear Algebra |
| rtdt_matrix-transform.js | translation(), scaling(), rotation() | Transforms |
| rtdt_ray.js | ray class | Ray Casting |
| rtdt_light.js | point_light class | Lighting |
| rtdt_material.js | material class | Materials |
| rtdt_world.js | world class | Scene Management |
| rtdt_shade.js | lighting() | Shading |
| rtdt_p+e.js | sphere, plane, cube, cylinder, group | Primitives |
| rtdt_pattern.js | stripe_pattern, checkerboard_pattern | Patterns |
| rtdt_graphics.js | Canvas drawing functions | Browser Only |
| rtdt_objfile.js | loadOBJFile() (FileReader) | Browser Only |
| rtdt_objfile-node.js | loadOBJFile() (fs) | Node.js Only |
| rtdt_examples.js | scene1(), scene2(), scene3() | Examples |
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
