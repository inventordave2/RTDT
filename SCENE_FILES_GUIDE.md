# RtDt scene files and dependencies

RtDt currently has **two different scene-file efforts**. Do not confuse them:

1. **Browser `.scene` JSON v1:** implemented by `rtdt_scene_browser.js` with `rtdt_scene_assets.js`; designed for the static `webapp.html`.
2. **Experimental `.scene.yaml` YAML:** parsed by `rtdt_scene_loader.js`, with restricted maths and repeat directives. Camera application and transform composition are unfinished, and this is **not** loaded by the browser importer or offered as a supported CLI `--scene-file` option.

## Working browser JSON structure

Save as `example.scene`:

~~~json
{
  "version": 1,
  "name": "Three objects",
  "camera": {"from": [0, 3, -12], "to": [0, 0, 0], "up": [0, 1, 0], "fov": 45},
  "light": {"position": [-8, 12, -8], "intensity": [1, 1, 1]},
  "background": [0.02, 0.03, 0.10],
  "objects": [
    {"type": "sphere", "name": "ball", "position": [-1.5, 0, 0], "scale": [1, 1, 1], "color": [0.2, 0.6, 0.9]},
    {"type": "cube", "name": "box", "position": [1.5, 0, 0], "color": [0.9, 0.3, 0.1]},
    {"type": "plane", "name": "ground", "position": [0, -1.5, 0], "color": [0.6, 0.6, 0.6]}
  ]
}
~~~

The optional top-level `background` field sets the ray-miss colour as normalized RGB, defaulting to black `[0,0,0]`. Black geometry is never recoloured. An empty `objects` array is allowed and renders a solid background. Both WebApp and shared Node renderer use the same ray-miss behaviour (the current CLI only exposes built-in scenes).

All coordinate and colour arrays have three finite numeric components. Colours and light intensities use normalized RGB channels (normally 0–1). `camera.fov` is in degrees. Supported object primitives are `sphere`, `cube`, `plane` and `mesh`. Each object may specify `position`, `scale`, `color` and numeric material properties such as `ambient`, `diffuse`, `specular`, `shininess`, `reflective`, `transparency` and `refractive_index`. Zero scales are rejected.

## Declaring asset dependencies

~~~json
{
  "version": 1,
  "camera": {"from": [0, 2, -8], "to": [0, 0, 0], "up": [0, 1, 0]},
  "objects": [{"type": "mesh", "name": "model", "mesh": "portrait/head.obj"}],
  "assets": {"mesh": [{"path": "portrait/head.obj", "required": true}]}
}
~~~

The browser resolver recognises:

| Section | Kind | Typical file |
| --- | --- | --- |
| `assets.mesh` | OBJ geometry | `.obj` |
| `assets.texture` | Material colour map | `.png`, `.jpg`, `.bmp`, `.ppm` |
| `assets.animation` | AetherOre pose track | `.phy` |

Each can be a path string or an object with `path`, `required` and optional `target`. Objects may directly reference `mesh` and `texture`. Paths are restricted to safe relative paths; parent traversal and arbitrary external URLs are rejected. The path is resolved relative to the containing `.scene` file. For example, `samples/orbit.scene` declares `orbit/orbit.phy`, which resolves to `samples/orbit/orbit.phy`. Every hosted scene keeps its private dependencies in `samples/<scene-name>/`; reusable dependencies belong in `samples/shared/` and are declared as `shared/<asset>`. The legacy `samples/...` prefix remains accepted for compatibility, but new scenes should not use it.

For **repository samples**, assets are fetched by the WebApp from the hosted repository. For **local files**, the user must select the `.scene` file **and** its dependencies in the Associated files input: browsers cannot traverse the user's filesystem silently. Missing required assets prevent scene completion/rendering.

**Limitations:** The dependency linker and scene-loading UI have recently changed and a regression has been reported; verify imported scenes in the live browser. OBJ mesh object/material integration, optional animation binding and texture mapping are actively evolving. The OBJ loader retains per-face-corner `vt` texture coordinates, triangulates quads and polygons, and interpolates UVs for photographic albedo textures on triangle meshes. Sphere and plane albedo mapping remains supported. Normal/bump-map and subsurface-scattering support are not yet implemented. Height and normal imports do not yet affect shading.

## AetherOre `.phy`

Version 1 JSON defines a timeline (`fps`) and object tracks by ID/index. Motion channels include `position`, `rotation`, `scale` and `shear` with timed keyframes. The calculator interpolates poses; the WebApp has experimental playback that raytraces frames successively, not a GPU real-time animation loop. See `samples/orbit.scene` and `orbit/orbit.phy`.

## Experimental YAML files

The `examples/*.scene.yaml` files document proposed procedural generation (math functions, repetition, reusable materials). The restricted evaluator is safer than JavaScript `eval`, but the YAML loader does not yet deliver full scene construction. Do not promise users that the WebApp will render them. Avoid executable JavaScript in scene config.

For the packaging workflow, see [SCENE_PACK_CREATION.md](SCENE_PACK_CREATION.md) and [SCENE_FILES_QUICKSTART.md](SCENE_FILES_QUICKSTART.md).
