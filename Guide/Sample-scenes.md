# Sample scenes

The supported [WebApp](../webapp.html) exposes eight hosted JSON v1 `.scene` files:

- [Lee Perry-Smith scanned head](../samples/lee-perry-smith-head.scene) — scanned 17,684-triangle OBJ geometry with smooth normals/UVs; the photographic skin map is not yet bundled. [Attribution](../samples/lee-perry-smith-head/LICENSE.txt).
- [Aurora Orrery](../samples/aurora-orrery.scene) — detailed original celestial scene and orbital ring OBJ meshes.
- [Rocket to Rainbow Planet](../samples/rocket-to-rainbow-planet.scene) — OBJ rocket parts.
- [Orbit Studio](../samples/orbit.scene) — includes [AetherOre animation](../samples/orbit/orbit.phy).
- [Prism Garden](../samples/prism-garden.scene)
- [Cosmic Orbs](../samples/cosmic-orbs.scene)
- [Neon City](../samples/neon-city.scene)
- [Reflection Studio](../samples/reflection-studio.scene)

A scene named `name.scene` keeps private assets in `name/` and references them as `name/model.obj`, relative to the `.scene` file. Truly shared sample-pack files go in `shared/`. Root [obj/](../obj) and [img/](../img) hold standalone bundled assets, not scene-pack dependencies.

See [creating a scene pack](Scene-pack-creation.md). The experimental `examples/*.scene.yaml` files are not supported browser scene packs.
