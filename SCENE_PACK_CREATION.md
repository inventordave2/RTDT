# Creating and publishing a RtDt scene pack

The working hosted scene format is **JSON version 1**, with the `.scene` file beside a subfolder containing assets private to that scene.

## Recommended layout

```text
samples/
  portrait.scene
  portrait/
    head.obj
    skin.jpg
    LICENSE.txt
  shared/
    reusable.obj
obj/                    # standalone bundled repository models
img/                    # standalone bundled repository images
user/~username/         # optional user-owned collection; publicly visible if committed
```

A `.scene` references assets **relative to its own folder**. For `samples/portrait.scene`, use `portrait/head.obj`, `portrait/skin.jpg` or `shared/reusable.obj`, not `samples/portrait/head.obj` or `../obj/other.obj`. The browser resolver blocks parent-directory traversal; new scene packs should not depend on root-level `img/` and `obj/` paths.

## Minimal `samples/portrait.scene`

```json
{
  "version": 1,
  "name": "Portrait studio",
  "background": [0.02, 0.03, 0.06],
  "camera": {
    "from": [0, 1.5, -6], "to": [0, 0.5, 0],
    "up": [0, 1, 0], "fov": 45
  },
  "light": {"position": [-5, 8, -7], "intensity": [1, 1, 1]},
  "objects": [
    {
      "type": "mesh", "name": "Head", "mesh": "portrait/head.obj",
      "position": [0, 0, 0], "scale": [1, 1, 1],
      "color": [0.8, 0.6, 0.5],
      "material": {"ambient": 0.15, "diffuse": 0.8, "specular": 0.25}
    }
  ],
  "assets": {
    "mesh": [{"path": "portrait/head.obj", "required": true}]
  }
}
```

For textured OBJ faces, add `"texture":"portrait/skin.jpg"` to the object and `"texture":[{"path":"portrait/skin.jpg","required":true}]` under `assets`. OBJ `vt` UV coordinates are required for textured triangles; `vn` specifies smooth vertex normals. The browser importer triangulates OBJ polygons and BVH-divides large mesh groups.

## Verify and publish

1. Put the files in `samples/` following the layout above, including licences and attribution for third-party assets.
2. Add an option to `webapp.html`'s `sceneRepoSelect` dropdown: `<option value="portrait" data-scene-path="samples/portrait.scene">Portrait</option>`.
3. Serve the repo over HTTP, e.g. `python -m http.server 8000`, and open `http://localhost:8000/webapp.html`.
4. Load the hosted scene, verify required assets, test a small render and then a higher-resolution render.
5. Add the scene to the test inventory and run `npm test`.

For private local scenes use **My computer** and select the scene and its dependencies manually; a public GitHub repo is not private user storage. Node root `cli.js` presently supports built-in scenes, not `--scene-file`. The YAML `.scene.yaml` examples are experimental and not supported by the WebApp.

See [SCENE_FILES_GUIDE.md](SCENE_FILES_GUIDE.md) and [user/README.md](user/README.md).
