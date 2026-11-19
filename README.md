# RtDt — Raytracer for Node.js and Web UI

**In active development · Architecture checked 18 November 2026.**

RtDt is a JavaScript raytracer for Node.js and a browser WebApp, with triangle meshes (including barycentric smooth normals), reflections, refraction, configurable cameras and lights, BVH subdivision, and AetherOre `.phy` keyframe animation. Designed and implemented by Dave as a reference for native-C porting and modelling.

## Try RtDt

**Browser:** [Open RtDt on GitHub Pages](https://inventordave2.github.io/RTDT/webapp.html). For local development, serve this repository over HTTP rather than opening `file://`:

```sh
python -m http.server 8000
# Open http://localhost:8000/webapp.html
```

The WebApp now opens with **RtDt repository · featured scenes** selected. Choose a featured scene, click **Load repository scene**, then **Start render**; the built-in primitives remain available under the Scene collection dropdown. The WebApp resolves declared hosted assets automatically. For your own local `.scene` files, select any needed local `.obj`, texture and `.phy` dependencies explicitly.

**Node.js:** the *currently wired* CLI still writes **P3 PPM**. Prefer the WebApp for PNG/JPEG/RGB BMP until the new Node export adapter is integrated:

```sh
node cli.js --help
node cli.js --list-scenes
node cli.js --scene scene1 --width 160 --height 90 --output preview.ppm
```

The CLI format/config work is **in progress, not released**: `rtdt_image_io_node.js` has PNG, JPEG (using `jpeg-js`), RGB BMP and compatibility PPM encoder implementations, and `rtdt_cli_config.js` has JSON/YAML configuration and batch-manifest handling, but the current `cli.js` is **not yet connected to them**. `--config`, `--batch` and `--output-dir` are therefore not yet usable. `-h` still conflicts with height; use `--height`.

## Sample scenes and assets

- **[Aurora Orrery · Celestial Observatory](samples/aurora-orrery.scene)**: 67-object original high-detail scene featuring three independently shaded smooth-normal orbital OBJ rings ([gold](samples/aurora-orrery/orrery-gold-ring.obj), [cyan](samples/aurora-orrery/orrery-cyan-ring.obj), [rose](samples/aurora-orrery/orrery-rose-ring.obj)), reusable [faceted crystals](samples/aurora-orrery/faceted-crystal.obj), illuminated planetary spheres, a reflective floor and celestial accents. Four OBJ assets are declared and loaded automatically; large meshes receive BVH subdivision. **Start at Preview (160×90)** before increasing resolution, as triangle raytracing can be CPU-intensive.
- [Orbit Studio](samples/orbit.scene) + [AetherOre `.phy`](samples/orbit/orbit.phy): declarative JSON v1 sample and keyframe animation.
- [Rocket to Rainbow Planet](samples/rocket-to-rainbow-planet.scene): a **new colourful scene with 14 objects**, including [smooth-normal rocket body](samples/rocket-to-rainbow-planet/rocket_hull.obj), [fins](samples/rocket-to-rainbow-planet/rocket_fins.obj), [engine](samples/rocket-to-rainbow-planet/rocket_engine.obj) and [satellite](samples/rocket-to-rainbow-planet/rocket_satellite.obj). Four OBJ dependencies are automatically declared; the browser importer now preserves OBJ `vn` normals for smooth triangles.
- [Prism Garden](samples/prism-garden.scene): colourful primitives and a reflective stage.
- [Cosmic Orbs](samples/cosmic-orbs.scene): vibrant planets and moonlike spheres.
- [Neon City](samples/neon-city.scene): geometric towers on a reflective avenue.
- [Reflection Studio](samples/reflection-studio.scene): a compact reflection and material showcase.
- [Lee Perry-Smith 3D head scan](samples/lee-perry-smith-head.scene): a scanned human portrait containing 17,684 UV-mapped triangles, with scene-private [OBJ geometry](samples/lee-perry-smith-head/lee-perry-smith-head.obj) and [CC BY 3.0 attribution](samples/lee-perry-smith-head/LICENSE.txt). **Geometry preview only:** the original photographic skin image is not yet bundled, and true area/spherical light sampling is still pending.
- [Pyramid OBJ](obj/pyramid.obj) and the existing Earth JPEG sample.

All **eight hosted scenes** are available directly in the default featured-scene dropdown. The `.scene` documents declare their hosted OBJ dependencies; no manual upload is needed. Assets are declared relative to each `.scene` file: `aurora-orrery/` or `rocket-to-rainbow-planet/` contain private OBJ geometry; `shared/` is for reusable assets. The browser JSON loader accepts a flat list of scene objects, while the renderer internally groups mesh triangles into bounding-volume hierarchies. The dedicated auto-render preview gallery remains future work. The showcase composition is newly added and needs full live-browser visual validation.

Browser JSON `.scene` files may specify a top-level `"background": [r, g, b]` (normalized RGB); the default is black. Ray misses use that colour, without changing genuinely black surfaces. The shared Node renderer uses the same behaviour.

## Current architecture

| Component | Responsibility |
| --- | --- |
| `webapp.html`, `rtdt_ui_browser_20261118.js` | Browser UI, scene selection, progress, export, controls, animation playback |
| `raytracer-core.js` | Shared renderer; `RtDtState.scene`, `RtDtState.meshImport`, `RtDtState.renderOptions` |
| `rtdt_scene_browser.js` | Safe declarative browser `.scene` JSON v1 construction |
| `rtdt_scene_assets.js` | Repository/local asset resolution, OBJ triangle and smooth-normal loading |
| `rtdt_aetherore.js` | `.phy` keyframe interpretation and pose interpolation |
| `rtdt_colour.js`, `rtdt_image_io_browser.js` | RGB colour, PNG/JPEG/BMP browser export, legacy PPM |
| `cli.js` | Node rendering of built-in scenes; currently PPM output |
| `rtdt_image_io_node.js`, `rtdt_cli_config.js` | **Staged** Node image and config support; not yet called by `cli.js` |
| `rtdt_scene_loader.js` | Separate experimental YAML scene parsing; scene construction limitations remain |

### Lighting and animation

The current renderer supports a **24-bit RGB point light**. **Area and spherical light sampling are not implemented** yet. The WebApp can apply `.phy` poses and attempts sequential raytraced animation frames; there is no implemented stitched-video/GIF export. Keyframe expression evaluation is not a general Newtonian physics integrator.

### Known limitations and validation

- The `Data is not defined` scene-load regression was fixed in the group constructor. Built-in and JSON scene construction/rendered-pixel tests passed. **Full live-browser interaction/render verification remains outstanding.**
- `raytracer.html`, `raytracer.js` and `raytracer-ui.js` are **legacy and still present**; the supported entry is `webapp.html`.
- CLI image-format parity, `--config`, `--batch`, `--output-dir`, `-h` shorthand fix, and full on-disk image decoding/regression tests are **in progress**.
- YAML parser support must not be confused with complete YAML scene construction.
- Area and spherical light support, full renderer instance isolation, and the dedicated first-run auto-render gallery remain planned work.

## Testing

```sh
npm test
node tests/scene-render-smoke.test.js
node tests/scene-expressions.test.js
node tests/rgb-bmp.test.js
node tests/scene-assets-layout.test.js
```

`npm test` runs those four focused suites. The scene smoke test and new scene-assets-layout test check scene construction, linked assets, real OBJ UVs, bilinear texture sampling and raytraced pixels; this is **not yet a whole-image CLI or live-browser end-to-end test**.

See [Architecture](ARCHITECTURE.md), [CLI guide](CLI_README.md), [Scene-file guide](SCENE_FILES_GUIDE.md), and [Deployment checklist](DEPLOYMENT_CHECKLIST.md). Historical plans and completion reports have moved to [the development archive](docs/archive/rtdt-development-docs/README.md). See [creating scene packs](SCENE_PACK_CREATION.md) and [development notes](docs/DEVELOPMENT_NOTES.md).
