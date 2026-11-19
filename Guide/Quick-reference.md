# RtDt quick reference — active entrypoints

- WebApp: https://inventordave2.github.io/RTDT/webapp.html
- Node CLI: `node cli.js --help`
- Available built-in scenes: `node cli.js --list-scenes`
- Node preview render: `node cli.js --scene scene1 --width 160 --height 90 --output preview.ppm`
- Tests: `npm test`
- Pack creation: [SCENE_PACK_CREATION.md](Scene-pack-creation.md)
- Development reference: [docs/DEVELOPMENT_NOTES.md](../docs/DEVELOPMENT_NOTES.md)

Node writes P3 PPM only and does not yet integrate `--config`, `--batch`, `--output-dir` or `--scene-file`. True area/spherical lights, photographic head-scan texture and full live browser verification remain pending. Historical completion claims and bootstrap CLI instructions have been archived under [docs/archive/rtdt-development-docs/](../docs/archive/rtdt-development-docs).
