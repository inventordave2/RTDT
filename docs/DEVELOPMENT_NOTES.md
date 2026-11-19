# RtDt development notes

Last reviewed: 19 November 2026.

## References

- Wiley / Fleming image-mapping resource (user-provided URL): https://www.wiley.com/legacy/compbooks/fleming/imagemaps.htm
  Recorded as a reference; availability and contents have not been independently verified.

## Current technical state

- Shared JavaScript raytracing engine, WebApp, built-in scene Node CLI.
- JSON v1 `.scene` loading is supported in the WebApp; Node `--scene-file` is **not wired**.
- OBJ triangle groups, per-corner UV interpolation, smooth vertex normals, BVH and a scale-relative determinant tolerance are implemented.
- The Lee Perry-Smith scanned head is a geometry preview: the photographic skin map is not bundled.
- Sampled area/spherical lights, bump/normal maps, full Node CLI PNG/JPEG/BMP and configuration/batch handling remain incomplete.
- Browser end-to-end rendering and the full `npm test` suite require verification.

Original implementation plans and superseded completion statements are preserved under [historical development documents](archive/rtdt-development-docs/README.md). These archives are not current operational instructions.
