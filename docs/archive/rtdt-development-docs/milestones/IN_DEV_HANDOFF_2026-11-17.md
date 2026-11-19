# RtDt in-development handoff — 17 November 2026

**Status:** This is a continuation note, not a release certificate. Current branch: `main`. Browser: https://inventordave2.github.io/RTDT/webapp.html.

## Urgent unresolved work

- **Scene-load/render regression:** A user reported red error messages after selecting a scene and rendering reports "scene not loaded". Needs a real browser reproduction and fix before another release claim.
- **First-run experience:** Add a single-click set of attractive sample scenes that load dependencies, choose preview settings, render, and allow moving to the next example.
- **Robot branding:** Original Thoughtful Rainbow Lens Robot Mascot is the boy near camera; another specific girl robot from a previously referenced **third image** should sit beside him viewing a floating video screen. Do not redesign the originals. The last companions image used the wrong girl. Original assets and draft renders are saved in the user's ChatGPT Library.
- **Naming:** Rename global `OBJFILECONTENTS` to a consistent conventional identifier, preferably a scoped `objFileContents`, and migrate all references safely.
- **YAML & JSON:** User says YAML and JSON loaders work together for configuration strings/files. Recheck their actual interoperability with runnable tests. The old docs said "YAML loader unfinished" because `rtdt_scene_loader.js` contains TODOs for camera application/transform composition; those are specific limitations and do not mean the parser itself is broken.
- **Architecture cleanup requested but unfinished:** Remove old `raytracer.html`, complete CLI PNG/JPEG/24-bit RGB BMP export, implement `--config`, `--batch`, `--output-dir`, fix `-h` height/help collision, and add meaningful rendering tests.

## Documentation refresh

21 Markdown files existed at audit time. These **six** have been rewritten and committed to describe current `main` code: `README.md`, `ARCHITECTURE.md`, `CLI_README.md`, `SCENE_FILES_GUIDE.md`, `DEPLOYMENT_CHECKLIST.md`, `INDEX.md`. **Fifteen others are not refreshed yet**, including `PROJECT_INDEX.md`, `PHASE2_STATUS.md`, `QUICK_REFERENCE.md`, `refactoring-plan/*.md` and others. Update them from checked-in code and preserve historical plan intent.

## Observed code facts

`RtDtState.scene` holds current scene data; `RtDtState.meshImport` replaces the OBJ bookkeeping subset of old `DataR`; `RtDtState.renderOptions.bvhThreshold` holds subdivision threshold. The current `cli.js` still writes P3 PPM despite browser PNG/JPEG/RGB BMP. The WebApp uses `rtdt_scene_browser.js`, `rtdt_scene_assets.js` and `rtdt_ui_browser.js`; `rtdt_aetherore.js` handles `.phy` tracks. A standalone `rtdt_scene_loader.js` parses YAML and contains some incomplete scene-construction tasks. Latest RGB BMP regression test: `tests/rgb-bmp.test.js`.

**Do not claim that tests or app are fully functional without running scene load + render, CLI outputs, and browser interaction tests.**
