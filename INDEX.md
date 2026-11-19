# RtDt documentation index

**Current status:** active in-development JavaScript raytracer, dual browser/Node entrypoints with feature differences. Reviewed against `main` on 17 November 2026.

| Guide | Purpose |
| --- | --- |
| [README.md](README.md) | Project overview, quick launch, known limitations |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Actual modules, state domains, browser/Node responsibilities |
| [CLI_README.md](CLI_README.md) | Current CLI options and **PPM-only CLI** limitation |
| [SCENE_FILES_GUIDE.md](SCENE_FILES_GUIDE.md) | JSON `.scene` v1, asset dependencies, experimental YAML |
| [SCENE_FILES_QUICKSTART.md](SCENE_FILES_QUICKSTART.md) | Working browser JSON scene quick start |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Short developer and UI reference |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | GitHub Pages verification checklist |
| [cli/README.md](cli/README.md) | CLI folder notes and authoritative root entrypoint |
| [samples/README.md](samples/README.md) | Hosted sample files and compatibility |
| [Development archive](docs/archive/rtdt-development-docs/README.md) | Historical proposals and obsolete milestone reports |

**Read this before relying on old documentation:** `webapp.html` is the supported browser UI; `raytracer.html`, `raytracer.js` and `raytracer-ui.js` were removed as unused legacy entrypoints. The globals `Data` / `DataR` were replaced in active modules by `RtDtState.scene`, `RtDtState.meshImport` and `RtDtState.renderOptions`. Browser image export supports PNG/JPEG/24-bit BMP; CLI output is still P3 PPM. `--config`, `--batch` and `--output-dir` are **not implemented**. The browser scene-load regression needs verification.

Older `refactoring-plan/` documents and historical completion reports are [archived](docs/archive/rtdt-development-docs/README.md) and are not current operational guidance.

See [scene-pack creation](SCENE_PACK_CREATION.md), [user-owned assets](user/README.md), and [development notes](docs/DEVELOPMENT_NOTES.md).
