# RtDt deployment checklist (GitHub Pages)

**Target:** `https://inventordave2.github.io/RTDT/webapp.html` from repository `main` / root. This checklist is for the **static browser workbench**, not a Node hosting service.

## Source and publish configuration

- [ ] Confirm GitHub Pages source is `main` / `/(root)` in repository Settings → Pages.
- [ ] Confirm `webapp.html` and all referenced `rtdt_*.js` scripts exist and can be requested from the deployed path.
- [ ] Confirm the deployed commit SHA matches the intended `main` commit; a browser may cache older HTML/scripts.
- [ ] Serve from an HTTP(S) origin, not a `file://` page for repository asset fetches.
- [ ] Check the browser DevTools console and Network panel for 404s, missing script errors and MIME/CORS failures.

## Mandatory user-journey checks

- [ ] **Built-in scene:** select Primitives, load, ensure success status, then render an image on the canvas.
- [ ] **Repository scene:** select Orbit Studio (`samples/orbit.scene`), verify associated `samples/orbit/orbit.phy` is resolved, and render.
- [ ] **Local scene:** select a local `.scene` and its required OBJ/image/PHY dependencies, then render.
- [ ] OBJ mesh import and required-asset notices work without leaving the app in a false loaded state.
- [ ] AetherOre apply-pose and Play/Stop controls behave correctly; playback is frame-by-frame raytracing and may be slow.
- [ ] Camera and 24-bit RGB point-light settings update an actual scene.
- [ ] BVH optimisation reports whether subdivisions were created.
- [ ] Export a rendered PNG, JPEG, **24-bit RGB BMP** and indexed BMP; verify resulting files can be opened.
- [ ] File / Render / Help menus, About, shortcuts and scene-object selection dialogs open and close correctly.
- [ ] Canvas stays in the main workspace next to the sidebar at desktop widths; narrow layouts stack appropriately.

## Current risk register

**Open:** a user has reported red scene-load errors and inability to render after a selected scene; this has not yet been verified as fixed through a real-browser smoke test. Treat deploy as unverified until the scene/load/render checks pass.

**Other limitations:** no browser YAML scene import; no area/sphere-light shading; mesh UV albedo supported; no normal/height shading; legacy `raytracer.html`, `raytracer.js` and `raytracer-ui.js` have been removed; CLI `--config` / `--batch` / `--output-dir` and PNG/JPEG/BMP output remain unimplemented.

## Local validation

~~~sh
python -m http.server 8000
# open http://localhost:8000/webapp.html
node cli.js --help
node tests/scene-expressions.test.js
node tests/rgb-bmp.test.js
~~~

`npm test` runs four regression suites, not a live browser end-to-end render. These commands are **not a substitute for an actual rendered-image smoke test**.

If deployment is stale, inspect GitHub Actions/Pages and use a cache-busting query string on `webapp.html`. Do not assume a successful commit means the published WebApp is functional.
