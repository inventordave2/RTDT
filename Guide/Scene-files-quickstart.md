# RtDt scene files — quick start

**Supported browser scene description:** JSON `.scene` version 1. The previous `cli-bootstrap.js --scene-file *.scene.yaml` instructions were obsolete and are retained in [archived development docs](../docs/archive/rtdt-development-docs/README.md).

Follow [SCENE_PACK_CREATION.md](Scene-pack-creation.md) for a runnable scene-pack example with OBJ files, optional textures, scene-relative paths, validation and publishing.

For existing examples, open [webapp.html](../webapp.html) over HTTP; choose **RtDt repository · featured scenes**, select a scene, click **Load repository scene** and then **Start render**.

The supported Node CLI is root `node cli.js`, currently for built-in scenes and P3 PPM output. The CLI does **not** yet support `--scene-file`, `--batch`, `--config`, or YAML scene execution.
