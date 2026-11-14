# RTDT Scene Files Guide

Create ornate, complex 3D scenes without programming in JavaScript!

## Overview

RTDT Scene Files (.scene.yaml) let you define complex raytraced scenes using a declarative YAML format with built-in support for:

- **Math expressions** - Use formulas like `i*2`, `sin(angle)`, `2*pi/10`
- **Repeat loops** - Generate patterns automatically with the `repeat` directive
- **Material definitions** - Define reusable materials with consistent properties
- **Nested groups** - Organize objects hierarchically
- **Transform composition** - Chain transformations (rotation, translation, scaling)

## File Format

Scene files use **.scene.yaml** extension and follow YAML syntax.

### Basic Structure

```yaml
metadata:
  name: "Scene Name"
  author: "Your Name"
  description: "What this scene shows"

materials:
  material_name:
    color: [R, G, B]          # 0-1 range
    diffuse: 0.8
    specular: 0.5
    shininess: 100
    reflective: 0.3
    transparency: 0.0
    refractive_index: 1.0

cameras:
  - position: [X, Y, Z]
    target: [X, Y, Z]
    up: [0, 1, 0]
    fov: 45

lights:
  - position: [X, Y, Z]
    intensity: [R, G, B]

objects:
  - type: sphere
    radius: 1.0
    position: [X, Y, Z]
    material: material_name
```

## Data Types

### Colors
Specified as arrays [R, G, B] where each component is 0-1:
```yaml
color: [1, 0, 0]       # Red
color: [0, 1, 0]       # Green
color: [0, 0, 1]       # Blue
color: [1, 1, 1]       # White
```

### Positions/Vectors
Specified as arrays [X, Y, Z]:
```yaml
position: [0, 5, 10]
scaling: [1, 2, 3]
```

### Materials
Reference materials by name:
```yaml
material: marble           # Uses defined material
material: ruby
```

## Object Types

### Sphere
```yaml
- type: sphere
  radius: 1.0
  position: [0, 0, 0]
  material: ruby
```

### Cube/Box
```yaml
- type: cube
  scaling: [1, 1, 1]
  position: [0, 0, 0]
  material: marble
```

### Plane
```yaml
- type: plane
  position: [0, -1, 0]
  material: ground
```

### Group (Container)
```yaml
- type: group
  children:
    - type: sphere
      ...
```

## Repeat Loops

The `repeat` directive expands objects into multiple instances. Perfect for creating patterns!

### Basic Repeat

```yaml
- type: group
  repeat:
    count: 10
  children:
    - type: sphere
      position: [i, 0, 0]
      radius: "0.5 + i*0.1"
```

This creates 10 spheres positioned at x=0,1,2,3...9 with increasing radius.

**Loop variable `i`**: Automatically 0 to count-1

### Circular Repeat

```yaml
- type: group
  repeat:
    count: 12
    transform: "rotation_y(i * 2*pi/12)"
  children:
    - type: sphere
      position: [5, 0, 0]
      radius: 0.3
```

This creates 12 spheres arranged in a circle.

### Nested Repeats

```yaml
- type: group
  repeat:
    count: 5
  children:
    - type: group
      repeat:
        count: 5
      children:
        - type: sphere
          position: "[i*2, 0, j*2]"
```

**Note**: Currently, nested repeats use separate counters. Inner loops still use `i`.

## Math Expressions

Any numeric value can be an expression:

```yaml
radius: "0.5 + i*0.02"              # Increasing radius
position: "[3*i, sin(i*pi/5), 0]"   # Sine wave positions
reflective: "0.2 + i*0.05"          # Gradual reflectivity
```

### Available Math Functions

| Function | Usage | Example |
|----------|-------|---------|
| `sin(x)` | Sine | `sin(pi/2)` → 1 |
| `cos(x)` | Cosine | `cos(pi)` → -1 |
| `tan(x)` | Tangent | `tan(pi/4)` → 1 |
| `sqrt(x)` | Square root | `sqrt(4)` → 2 |
| `abs(x)` | Absolute value | `abs(-5)` → 5 |
| `floor(x)` | Floor | `floor(3.7)` → 3 |
| `ceil(x)` | Ceiling | `ceil(3.2)` → 4 |
| `round(x)` | Round | `round(3.5)` → 4 |
| `pow(x, y)` | Power | `pow(2, 3)` → 8 |
| `min(x, y)` | Minimum | `min(3, 5)` → 3 |
| `max(x, y)` | Maximum | `max(3, 5)` → 5 |

### Constants

- `pi` or `Math.PI` → 3.14159...
- `e` or `Math.E` → 2.71828...

### Loop Variable

- `i` → Current loop iteration (0 to count-1)

## Material Properties

### Color
RGB values (0-1 range):
```yaml
color: [0.8, 0.2, 0.1]
```

### Ambient
How much light is always present:
```yaml
ambient: 0.1        # Low ambient (realistic)
ambient: 0.5        # High ambient (flat)
```

### Diffuse
How much light is scattered:
```yaml
diffuse: 0.7        # Matte surface
diffuse: 0.9        # Bright matte
```

### Specular
Shiny highlights:
```yaml
specular: 0.3       # Dull
specular: 0.8       # Shiny
```

### Shininess
Size of highlights (higher = sharper):
```yaml
shininess: 50       # Soft highlights
shininess: 200      # Sharp highlights
```

### Reflective
Mirror reflection (0-1):
```yaml
reflective: 0.0     # No reflection
reflective: 0.5     # Half mirror
reflective: 0.9     # Very reflective
```

### Transparency
See-through amount (0-1):
```yaml
transparency: 0.0   # Opaque
transparency: 0.5   # Semi-transparent
transparency: 1.0   # Fully transparent
```

### Refractive Index
How much light bends (for transparent materials):
```yaml
refractive_index: 1.0      # Air/vacuum
refractive_index: 1.5      # Glass
refractive_index: 1.77     # Sapphire
refractive_index: 2.4      # Diamond
```

### Casts Shadow
Whether this object casts shadows:
```yaml
casts_shadow: true
casts_shadow: false
```

## Using Scene Files

### Command Line

```bash
# Render a scene file
node cli-bootstrap.js --scene-file my_scene.scene.yaml

# With output file
node cli-bootstrap.js --scene-file my_scene.scene.yaml --output result.ppm

# With custom dimensions
node cli-bootstrap.js --scene-file my_scene.scene.yaml --width 1920 --height 1080

# High quality
node cli-bootstrap.js --scene-file my_scene.scene.yaml --quality 5 --output hires.ppm
```

### File Location

Place .scene.yaml files anywhere and reference them with relative or absolute paths:

```bash
node cli-bootstrap.js --scene-file ./examples/spiral_garden.scene.yaml
node cli-bootstrap.js --scene-file /path/to/my_scene.scene.yaml
```

## Example: Spiral Pattern

```yaml
metadata:
  name: "Spiral"

materials:
  red:
    color: [1, 0, 0]
    diffuse: 0.8
    reflective: 0.3

cameras:
  - position: [0, 5, 10]
    target: [0, 0, 0]

lights:
  - position: [10, 10, 10]
    intensity: [1, 1, 1]

objects:
  - type: group
    repeat:
      count: 20
      transform: "rotation_y(i * 2*pi/20) @ translation(3 + i*0.2, i*0.3, 0)"
    children:
      - type: sphere
        radius: "0.5 + i*0.03"
        material: red
```

This creates 20 spheres arranged in an ascending spiral!

## Example: 5x5 Grid

```yaml
materials:
  white:
    color: [1, 1, 1]
    diffuse: 0.8

objects:
  - type: group
    repeat:
      count: 5
    children:
      - type: group
        repeat:
          count: 5
        children:
          - type: sphere
            radius: 0.4
            position: "[i*2, 1, j*2]"
            material: white
```

Creates a 5x5 grid of evenly-spaced spheres.

## Example: Tower with Ornaments

```yaml
materials:
  stone:
    color: [0.6, 0.6, 0.6]
    diffuse: 0.7
  gold:
    color: [1, 0.84, 0]
    diffuse: 0.8
    reflective: 0.6

objects:
  # Base
  - type: cube
    scaling: [3, 0.5, 3]
    position: [0, 0, 0]
    material: stone
  
  # Tower with ornaments
  - type: group
    repeat:
      count: 5
    children:
      - type: cube
        scaling: ["2 - i*0.3, 1, 2 - i*0.3"]
        position: "[0, i*2 + 1, 0]"
        material: stone
      
      - type: group
        repeat:
          count: 8
        children:
          - type: sphere
            radius: 0.3
            position: "[(2-i*0.3) * cos(j*2*pi/8), i*2 + 1.5, (2-i*0.3) * sin(j*2*pi/8)]"
            material: gold
```

Creates a tapered tower with gold ornaments around each level.

## Common Patterns

### Regular Grid
```yaml
- type: group
  repeat:
    count: N
  children:
    - type: [object]
      position: "[i * SPACING, HEIGHT, 0]"
```

### Circular Ring
```yaml
- type: group
  repeat:
    count: N
  children:
    - type: [object]
      position: "[RADIUS * cos(i * 2*pi/N), HEIGHT, RADIUS * sin(i * 2*pi/N)]"
```

### Spiral
```yaml
- type: group
  repeat:
    count: N
  children:
    - type: [object]
      position: "[(START + i*STEP) * cos(i*ANGLE), i*HEIGHT_STEP, (START + i*STEP) * sin(i*ANGLE)]"
```

### Expanding/Contracting
```yaml
- type: group
  repeat:
    count: N
  children:
    - type: [object]
      radius: "MAX_RADIUS * (N - i) / N"
      position: "[0, i * STEP, 0]"
```

## Troubleshooting

### Expression Not Evaluated
**Problem**: `position: "i*2"` shows as string, not position
**Solution**: Make sure it's quoted and contains math operators:
```yaml
position: "[i*2, 0, 0]"    # ✓ Correct
position: [i*2, 0, 0]     # ✗ Wrong (not a string)
```

### Infinite Loop or Hanging
**Problem**: Scene takes forever to render
**Solution**: Check repeat counts and nested loops
```yaml
repeat:
  count: 5     # ✓ Reasonable
repeat:
  count: 10000 # ✗ Too many
```

### File Not Found
**Problem**: "Scene file not found"
**Solution**: Use correct path:
```bash
# Relative to current directory
node cli-bootstrap.js --scene-file ./examples/scene.yaml

# Absolute path
node cli-bootstrap.js --scene-file /home/user/scenes/scene.yaml
```

### Material Not Applied
**Problem**: Objects appear white/default
**Solution**: Check material name matches:
```yaml
materials:
  red:        # Define it
    color: [1, 0, 0]

objects:
  - type: sphere
    material: red   # Use same name
```

## Tips and Tricks

1. **Start simple**: Create a single sphere, then add complexity
2. **Use comments**: YAML supports `# comments` for documentation
3. **Test expressions**: Write expressions like `sin(pi/2)` in the console to verify math
4. **Vary materials**: Use different materials in repeats for visual interest
5. **Combine transforms**: Chain transforms with `@` to create complex movements
6. **Adjust quality**: Use `--quality 1` for testing, `--quality 5` for final renders

## Advanced Features (Future)

Planned additions to scene file format:
- Conditional object placement (`if` expressions)
- Fibonacci and other algorithmic patterns
- Custom function definitions
- Scene composition (include other scene files)
- Animation parameters (for future animation support)

## Getting Help

Example scene files are provided in `./examples/`:
- `spiral_garden.scene.yaml` - Ornate spiral with loops
- `simple_grid.scene.yaml` - 5x5 grid pattern
- `ornate_tower.scene.yaml` - Tapered tower with ornaments

Study these examples to learn the format!

---

**Happy rendering!** 🎨🖼️
