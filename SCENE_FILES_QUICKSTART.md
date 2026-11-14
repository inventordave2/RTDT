# Quick Start: Scene Files

Get creating in 5 minutes!

## Basic Template

Copy this and customize:

```yaml
metadata:
  name: "My Scene"

materials:
  blue:
    color: [0, 0, 1]
    diffuse: 0.8

cameras:
  - position: [0, 5, 10]
    target: [0, 0, 0]

lights:
  - position: [10, 10, 10]
    intensity: [1, 1, 1]

objects:
  - type: sphere
    radius: 1
    position: [0, 0, 0]
    material: blue
```

## Render It

```bash
node cli-bootstrap.js --scene-file my_scene.scene.yaml --output my_scene.ppm
```

## Add Pattern (Repeat Loop)

```yaml
objects:
  - type: group
    repeat:
      count: 5
    children:
      - type: sphere
        position: "[i*2, 0, 0]"
        radius: "0.5 + i*0.1"
        material: blue
```

This creates 5 spheres: positions 0, 2, 4, 6, 8 with increasing size.

## Make It Circular

```yaml
- type: group
  repeat:
    count: 8
  children:
    - type: sphere
      position: "[3*cos(i*2*pi/8), 0, 3*sin(i*2*pi/8)]"
      radius: 0.3
      material: blue
```

Creates 8 spheres in a circle of radius 3.

## Multiple Materials

```yaml
materials:
  red:
    color: [1, 0, 0]
    diffuse: 0.8
  
  gold:
    color: [1, 0.84, 0]
    reflective: 0.6
    diffuse: 0.8

objects:
  - type: sphere
    material: red
  - type: cube
    material: gold
```

## All Object Types

```yaml
- type: sphere       # Round ball
  radius: 1

- type: cube         # Box
  scaling: [1, 1, 1]

- type: plane        # Flat surface
  position: [0, -1, 0]
```

## Math Functions

Use in any expression:

```yaml
sin(i * pi/10)      # Sine wave
cos(angle)          # Cosine
sqrt(i)             # Square root
abs(-5)             # Absolute value
pow(2, 3)           # 2^3 = 8
```

## Common Patterns

### Grid
```yaml
repeat:
  count: 10
children:
  - type: sphere
    position: "[i, 0, 0]"
```

### Spiral
```yaml
repeat:
  count: 20
children:
  - type: sphere
    position: "[(i*0.5) * cos(i*pi/5), i*0.3, (i*0.5) * sin(i*pi/5)]"
```

### Ring
```yaml
repeat:
  count: 12
children:
  - type: sphere
    position: "[5*cos(i*2*pi/12), 0, 5*sin(i*2*pi/12)]"
```

## Material Settings

```yaml
materials:
  shiny:
    color: [1, 1, 1]
    diffuse: 0.9        # 0-1, how matte
    specular: 0.8       # 0-1, how shiny
    shininess: 200      # Higher = sharper highlights
    reflective: 0.5     # 0-1, how mirror-like
    transparency: 0.2   # 0-1, see-through (0=opaque)
    refractive_index: 1.5  # For glass, diamond, etc
```

## Render Options

```bash
# Default (500x281 pixels)
node cli-bootstrap.js --scene-file scene.yaml

# HD (1920x1080)
node cli-bootstrap.js --scene-file scene.yaml --width 1920 --height 1080

# Quick preview (small)
node cli-bootstrap.js --scene-file scene.yaml --width 200 --height 113

# High quality (5 samples per pixel)
node cli-bootstrap.js --scene-file scene.yaml --quality 5

# Custom output
node cli-bootstrap.js --scene-file scene.yaml --output my_render.ppm
```

## Tips

1. **Test small first**: `--width 200 --height 100` renders fast
2. **Use quality 1-3**: More than 3 takes much longer
3. **Math check**: `sin(pi/2)` = 1, `cos(pi)` = -1, `2*pi` ≈ 6.28
4. **Line up position**: Put each axis on same line: `[i, 0, 0]`
5. **Color range**: Colors are 0-1: `[1, 0, 0]` is red, `[0.5, 0.5, 0.5]` is gray

## Example Files

See `./examples/` for working examples:
- `spiral_garden.scene.yaml` - Full featured example
- `simple_grid.scene.yaml` - Basic patterns
- `ornate_tower.scene.yaml` - Complex transformations

## Full Guide

See `SCENE_FILES_GUIDE.md` for complete documentation.

---

**Now create your masterpiece!** ✨
