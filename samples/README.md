# RtDt featured scene packs

The supported [WebApp](../webapp.html) exposes eight hosted JSON v1 `.scene` files:

- [Lee Perry-Smith scanned head](lee-perry-smith-head.scene) — scanned 17,684-triangle OBJ geometry with smooth normals/UVs; the photographic skin map is not yet bundled. [Attribution](lee-perry-smith-head/LICENSE.txt).
- [Aurora Orrery](aurora-orrery.scene) — detailed original celestial scene and orbital ring OBJ meshes.
- [Rocket to Rainbow Planet](rocket-to-rainbow-planet.scene) — OBJ rocket parts.
- [Orbit Studio](orbit.scene) — includes [AetherOre animation](orbit/orbit.phy).
- [Prism Garden](prism-garden.scene)
- [Cosmic Orbs](cosmic-orbs.scene)
- [Neon City](neon-city.scene)
- [Reflection Studio](reflection-studio.scene)

A scene named `name.scene` keeps private assets in `name/` and references them as `name/model.obj`, relative to the `.scene` file. Truly shared sample-pack files go in `shared/`. Root [obj/](../obj/) and [img/](../img/) hold standalone bundled assets, not scene-pack dependencies.

See [creating a scene pack](../SCENE_PACK_CREATION.md). The experimental `examples/*.scene.yaml` files are not supported browser scene packs.
