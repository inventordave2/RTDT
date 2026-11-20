# RtDt render control flow

This is the implemented control graph for the current WebApp and root Node CLI entrypoints, not a proposed refactor. Both routes share `camera.ray_for_pixel()`, `color_at()`, intersection/BVH and lighting functions, but own separate render loops.

```mermaid
flowchart TD
    U["User initiates render"] --> ENTRY{"Entrypoint"}
    ENTRY -->|WebApp| WB["btnRender click"]
    ENTRY -->|Node CLI| CM["cli.js main()"]

    subgraph WEB["Browser: rtdt_ui_browser_20261118.js"]
        WB --> WS["start_render()"]
        WS --> VALID{"Scene loaded, all required assets ready, settings valid, renderer idle?"}
        VALID -->|No| WREJECT["Show status, return"]
        VALID -->|Yes| WSET["Create camera/world; allocate pixels; set running; show progress"]
        WSET --> SCHEDULE["setTimeout(next_batch,0)"]
        SCHEDULE --> CANCEL{"cancelled?"}
        CANCEL -->|Yes| WSTOP["Clear pixels; finish_render(info)"]
        CANCEL -->|No| WBATCH["Trace up to 4 scanlines"]
        WBATCH --> DRAW["draw_scanlines() + render_progress()"]
        DRAW --> MORE{"More scanlines?"}
        MORE -->|Yes| SCHEDULE
        MORE -->|No| DONE["finish_render(success); workflow(3)"]
        WBATCH -->|Error| WERROR["Clear pixels; finish_render(error)"]
        DONE --> DOWNLOAD["Optional download_image()"]
    end

    subgraph NODE["Node: cli.js"]
        CM --> PARSE["parseArguments()"]
        PARSE --> BUILT["renderScene(): initRaytracer() + built-in scene constructor"]
        BUILT --> PHY["Optional AetherOre .phy pose"]
        PHY --> CWORLD["Construct world; use scene camera"]
        CWORLD --> SYNC["renderSceneSync(): nested pixel loop"]
        SYNC --> WRITE["writeRenderImage()"]
        WRITE --> IMAGE["rtdt_image_io_node.writeImage(): PNG/JPEG/BMP/PPM"]
        IMAGE --> EXIT["Image saved; process exits 0"]
        BUILT -->|Error| FAIL["Error report; exit 1"]
    end

    subgraph CORE["Shared RtDt renderer"]
        RAY["camera.ray_for_pixel(x,y)"] --> COLOR["color_at(world,ray,depth)"]
        COLOR --> INTER["intersect_world() -> shape/BVH intersections"]
        INTER --> HIT{"Closest valid hit?"}
        HIT -->|No| BG["Return background"]
        HIT -->|Yes| PREP["prepare_computations()"]
        PREP --> SHADE["shade_hit()"]
        SHADE --> LIGHT["lighting() + is_shadowed()"]
        LIGHT --> SECONDARY["reflected_color() / refracted_color()"]
        SECONDARY --> PIXEL["Return RGB"]
        BG --> PIXEL
        SECONDARY -.->|Secondary ray recursion| COLOR
    end

    WBATCH -.->|Each pixel| RAY
    PIXEL -.->|RGB pixel| WBATCH
    SYNC -.->|Each pixel| RAY
    PIXEL -.->|RGB pixel| SYNC
```

## Entry and output differences

| | WebApp | Node CLI |
| --- | --- | --- |
| Entrypoint | `btnRender` → `start_render()` | `main()` → `renderScene()` |
| Initialization | Requires loaded scene and all required assets | Runs a named built-in scene constructor; optional `.phy` pose |
| Render loop | `next_batch()`, up to four scanlines per event-loop tick | `renderSceneSync()`, synchronous pixel loop |
| Pixel path | `camera.ray_for_pixel()` → `color_at()` | Same |
| Output | Accumulate `pixels[]`, draw batches to canvas; download separately | `writeRenderImage()` selects encoder from extension |
| Cancellation | `cancel_render()` sets a flag checked between batches | Process termination; no scanline-level cancel path |
| Success | `finish_render('Render complete…','success')` | Image saved and exit code 0 |
| Errors | Batch-level catch → status message | Render-level catch → stderr and exit code 1 |

## Refactor watchpoints

- `start_render()` rebuilds the camera using `previous.field_of_view` but the camera object uses `previous.fov`; this can lose scene-defined field of view.
- Recursive shading decrements `remaining` at several levels (`color_at`, `shade_hit`, `reflected_color`, `refracted_color`); a bounce-depth review is needed.
- WebApp and CLI duplicate pixel-loop orchestration; the shared code is the actual per-ray path, not the render scheduler.
- AetherOre currently applies transform tracks to shape bindings. Camera flight tracks need a camera-aware binding and application path, not only a UI control.

See [Coding style](Coding-style.md).
