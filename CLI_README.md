# RtDt CLI — current state (18 November 2026)

The supported Node entry point is `cli.js`. The CLI is undergoing a format and configuration upgrade; distinguish the **currently wired CLI** from new support modules that have been committed but not integrated.

## Currently available

```sh
node cli.js --help
node cli.js --list-scenes
node cli.js --scene scene1 --width 160 --height 90 --output preview.ppm
```

Current option names include `--scene/-s`, `--width/-w`, `--height`, `--output/-o`, `--quality/-q`, `--phy`, `--time`, `--frame` and `--help/-h`. The CLI **still writes plain-text P3 PPM**, irrespective of output extension. Use `.ppm` for now. The `-h` help/height collision has not yet been fixed; use `--height`.

## In-progress Node image/config support

- `rtdt_image_io_node.js` implements a PNG encoder, JPEG encoder through the `jpeg-js` dependency, 24-bit RGB BMP through the shared colour adapter, plus optional legacy PPM. It rejects unsupported extensions.
- `rtdt_cli_config.js` implements JSON and YAML config parsing, job validation and batch manifests through the `yaml` dependency.
- **Neither module is yet called from `cli.js` on `main`**. The CLI does **not** yet accept `--config`, `--batch`, `--output-dir`, or a JSON `.scene` file as a scene argument. Do not run those examples until CLI integration and npm dependency installation are committed and tested.
- The historical `config.rdt` uses a JavaScript-like schema and is not a supported executable configuration.

## Architecture and testing

The CLI loads shared renderer modules via Node `vm.runInThisContext`, uses `RtDtState.scene` to hold the active world and camera, optionally applies a `.phy` pose, renders with `renderSceneSync`, then currently writes PPM.

```sh
npm test
node tests/scene-render-smoke.test.js
node tests/scene-expressions.test.js
node tests/rgb-bmp.test.js
```

Tests currently cover scene construction and pixels, expression evaluation and BMP encoding, **not yet a full CLI file render/decode pipeline**. A new batch/config/format end-to-end test is required before calling the upgrade complete.

See [README](README.md) and [Architecture](ARCHITECTURE.md).
