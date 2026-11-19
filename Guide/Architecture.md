# RtDt architecture — current development branch

**Source of truth:** repository `main`, reviewed 17 November 2026. This file documents the code that exists, not the architecture originally proposed in `docs/archive/rtdt-development-docs/`.

## Execution environments

| Concern | Browser | Node.js |
| --- | --- | --- |
| Entrypoint | `webapp.html` | `cli.js` |
| Loading | Ordered local script tags | `fs.readFileSync` + `vm.runInThisContext` in `cli.js` |
| UI | `rtdt_ui_browser_20261118.js` and DOM/canvas | CLI arguments and stdout/stderr |
| Scene selection | Built-ins or declarative JSON `.scene` | Built-in example factories (`--scene`) |
| Scene files | `rtdt_scene_browser.js` (JSON v1) | `rtdt_scene_loader.js` YAML parser exists, incomplete and not wired into CLI options |
| External assets | `rtdt_scene_assets.js`, local File API / same-origin fetch | `rtdt_objfile-node.js`, filesystem |
| Output | PNG/JPEG via canvas, 24-bit RGB BMP, indexed BMP, P3 PPM | P3 PPM only |
| Animations | `.phy` poses + experimental frame playback | `--phy` plus `--time` or `--frame` |

## Module layers

**Math and geometry:** `rtdt_math.js`, `rtdt_core.js`, `rtdt_matrix-transform.js`, `rtdt_matrix.js`, `rtdt_ray.js`, `rtdt_p+e.js`.

**Lighting/rendering:** `rtdt_light.js`, `rtdt_material.js`, `rtdt_world.js`, `rtdt_shade.js`, `rtdt_pattern.js`, `rtdt_examples.js`, `raytracer-core.js`.

**Runtime/state:** `raytracer-core.js` defines `RtDtState`. `RtDtState.scene` holds the active camera, point light, object group, texture images and presets; `RtDtState.meshImport` holds OBJ parsing offsets/bounds; `RtDtState.renderOptions.bvhThreshold` replaces the previous ambiguous `DataR.divideValue`. The old global identifiers `Data` and `DataR` should not be used in new active modules. **This is named global state, not full renderer instance isolation.** `WIDTH`, `HEIGHT` and additional globals still exist, and renders are not independent/parallel.

**Browser adapters:** `rtdt_ui_browser_20261118.js`, `rtdt_objfile.js`, `rtdt_image_io_browser.js`, `rtdt_colour.js`, `rtdt_graphics.js`, `rtdt_scene_browser.js`, `rtdt_scene_assets.js`.

**Node adapters:** `cli.js`, `rtdt_objfile-node.js`. `rtdt_scene_loader.js` provides experimental YAML parsing and safe restricted arithmetic but has unfinished transform composition and camera application.

**Animation:** `rtdt_aetherore.js` parses JSON `.phy` v1, evaluates channels at a time, composes matrices and updates bound objects. Playback controls attempt sequential raytracing; this requires performance and browser integration testing.

## Data and render flow

~~~text
WebApp: scene selection -> JSON parse -> declared asset resolution
        -> camera/light/shapes in RtDtState.scene -> render -> canvas -> export
CLI:    arguments -> built-in scene factory -> RtDtState.scene
        -> renderSceneSync -> P3 PPM file
~~~

The WebApp is a static page; same-origin repository samples can be fetched under GitHub Pages. Local files must be explicitly selected by the user. Browser-local YAML scene rendering is **not implemented**.

## Scene contract

`.scene` v1 JSON supports a camera (from/to/up/fov), one point light (position/intensity), and objects (sphere, cube, plane, mesh) with position/scale/colour/material fields. External dependencies can be declared through `assets.mesh`, `assets.texture` and `assets.animation`; asset references on objects (`mesh`, `texture`) are also inspected. Check [SCENE_FILES_GUIDE.md](Scene-files.md) for a minimal working example and documented limitations.

The OBJ importer and renderer are not a full DCC or glTF pipeline. OBJ mesh UV albedo mapping via per-triangle barycentric coordinates is implemented; normal maps and height/bump shading are pending. Area/sphere lights and sampled soft-shadow lighting are pending.

## BVH

`doDivide()` calls the active object's `divide(threshold)` where available. `bvhThreshold` is a **shape-count subdivision threshold**, not a render quality multiplier. The UI shows an optimisation status; benchmark complex meshes rather than assuming BVH helps small scenes.

## Development risks and next steps

1. **Restore and smoke-test scene loading and rendering** in real browsers following the state/asset/UI refactors; users have reported red errors and a scene-loaded mismatch.
2. Repair built-in scene functions that still reference legacy browser rendering hooks, and establish reliable import success/failure transitions.
3. Add Node/browser render correctness tests, then unify configuration and output encoders.
4. Finish CLI `--config`, `--batch`, `--output-dir`, height/help shorthand and PNG/JPEG/BMP encoding.
5. Move rendering state into per-render instances if parallel rendering is needed.
6. Keep the removed legacy `raytracer.html`, `raytracer.js` and `raytracer-ui.js` entrypoints retired; use `webapp.html` and the shared renderer core. Historical examples are archived.

See [PROJECT_INDEX.md](../PROJECT_INDEX.md) for a status matrix. Older roadmaps are retained as historical context, not completion evidence.
