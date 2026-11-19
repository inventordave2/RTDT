# Current Node CLI quick start

Run from the repository root:

```sh
node cli.js --help
node cli.js --list-scenes
node cli.js --scene scene1 --width 160 --height 90 --output preview.ppm
```

Output is P3 PPM. For hosted JSON `.scene` packs and PNG/JPEG/BMP exports use [webapp.html](../webapp.html). The old `cli-bootstrap.js` instructions are archived; there is no supported Node `--scene-file`, `--batch`, `--config`, or `--output-dir` yet.
