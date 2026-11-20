# RtDt CLI

The single supported Node.js entrypoint is `cli.js` at the repository root, also installed as the `rtdt` command by npm.

Run `npm install` once. Then render without an external converter:

```sh
node cli.js --scene scene1 --width 160 --height 90
node cli.js --scene scene1 --width 160 --height 90 --output preview.png
node cli.js --scene scene1 --width 160 --height 90 --output preview.jpg --jpeg-quality 92
node cli.js --scene scene1 --width 160 --height 90 --output preview.bmp
node cli.js --scene scene1 --width 160 --height 90 --output preview.ppm
node cli.js --scene scene1 --width 160 --height 90 --output c64.bmp --bmp-palette c64
node cli.js --scene scene1 --width 160 --height 90 --output ansi256.bmp --bmp-palette ansi256
node cli.js --scene scene1 --width 160 --height 90 --output ansi16.bmp --bmp-palette ansi16
node cli.js --scene scene1 --width 160 --height 90 --output html.bmp --bmp-palette html
node cli.js --scene scene1 --format png --output-dir renders
```

Without an output filename, PNG is written to `render.png`. The extension selects the actual encoder; conflicting `--format` and filename extensions produce an error rather than incorrect bytes. `--output-dir` creates the directory. `--jpeg-quality` sets JPEG quality (1–100), distinct from the renderer's `--quality` sample count.

BMP output supports true-colour 24-bit RGB (default), 8-bit ANSI256, 4-bit Commodore 64, 4-bit ANSI/VT100 (use `ansi16` or `vt100`), and 8-bit HTML named colours. The HTML indexed palette contains 139 unique RGB entries from the canonical 148 named CSS colour names, deduplicating aliases. Quantisation maps each pixel to the nearest palette entry.

Use `--height` or `-H` for height. `-h` is reserved for help.

Scene input remains built-in scene constructors; `--config`, `--batch`, and `--scene-file` are pending separate integration. AetherOre `.phy` animation support remains available through `--phy`, `--time`, and `--frame`.

## Checks

`npm test` runs scene/geometry checks and real CLI render/signature assertions for PNG, JPEG, all BMP palettes, and PPM. See [Guide index](Index.md).
