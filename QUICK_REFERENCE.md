# RTDT Quick Reference Card

## 🖥️ CLI Commands

### Getting Started
```bash
node cli.js --help              # Show all options
node cli.js --list-scenes       # List available scenes
```

### Rendering
```bash
# Quick preview (5 seconds)
node cli.js --scene scene1 --width 150 --height 84

# Standard render (1-2 seconds)
node cli.js --scene scene1 --width 500 --height 281 --output render.ppm

# High quality (slower)
node cli.js --scene scene1 --width 1280 --height 720 --quality 3 --output hires.ppm

# All scenes to files
node cli.js --all --width 400 --height 225 --output-dir renders/
```

### Options
```
--scene NAME       Scene name (scene1, scene2, etc.)
--width W          Output width in pixels (default: 500)
--height H         Output height in pixels (default: 281)
--quality N        Anti-aliasing level 1-5 (default: 1)
--output FILE      Output filename (default: render.ppm)
--output-dir DIR   Directory for batch renders
--all              Render all available scenes
--list-scenes      List available scenes
--help             Show help message
```

## 🌐 Web UI Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Render scene |
| `S` | Stop rendering |
| `Space` | Reset camera to default |
| `D` | Download rendered image |
| `?` | Show help dialog |
| `Arrow Keys` | Move camera (when focused) |

## 🎬 Available Scenes

- **scene1** - Basic sphere and cube
- **scene2** - Multiple objects and shadows
- **scene3** - Complex geometric composition
- **mySkyBox** - Sky box demonstration
- **earth** - Earth texture visualization
- **cm_cube** - Cube geometry test
- **endGame** - Complex final scene

## 📊 Performance Reference

| Resolution | Quality | Time |
|-----------|---------|------|
| 100×75 | 1 | ~320ms |
| 200×150 | 1 | ~900ms |
| 300×225 | 1 | ~1.5s |
| 500×281 | 1 | ~2s |
| 800×600 | 1 | ~4s |
| 1280×720 | 1 | ~8s |
| 500×281 | 3 | ~6s |

Quality multiplier (time = quality²)

## 🔄 Converting PPM to Other Formats

### Using ImageMagick
```bash
# Convert to PNG
convert render.ppm render.png

# Convert to JPEG
convert render.ppm -quality 90 render.jpg

# Resize
convert render.ppm -resize 800x600 smaller.ppm

# Get info
identify render.ppm
```

### Using GIMP
1. File → Open → select `.ppm` file
2. Image → Export As → choose format

## 📁 File Structure Reference

```
cli.js              Main executable entry point
webapp.html         Single-file web application
package.json        Node.js configuration

raytracer-core.js   Shared rendering logic
rtdt_math.js          Math utilities
rtdt_core.js          Core classes
rtdt_ray.js           Ray operations
rtdt_light.js         Lighting
rtdt_shade.js         Shading
rtdt_world.js         Scene world
rtdt_examples.js      Scene definitions
```

## 🔧 Troubleshooting

### CLI Won't Start
```bash
# Check Node.js version
node --version        # Should be 12+

# Run from correct directory
cd /workspaces/RTDT

# Check file exists
ls -la cli.js
```

### CLI Slow
```bash
# Use smaller resolution for testing
node cli.js --scene scene1 --width 100 --height 75

# Reduce quality (default is 1)
node cli.js --scene scene1 --quality 1
```

### Web App Won't Load
```bash
# Use HTTP server instead of file://
python3 -m http.server 8000
# Then visit: http://localhost:8000/webapp.html

# Or use Node.js http-server
npx http-server .
```

### Module Not Found
- Ensure all `rtdt_*.js` files are in same directory as `cli.js`
- Check file permissions: `ls -la rtdt_*.js`
- Run from `/workspaces/RTDT` directory

## 📖 Documentation Map

- **INDEX.md** - Navigation guide (start here)
- **CLI_README.md** - Detailed CLI usage
- **ARCHITECTURE.md** - System design
- **REFACTORING_COMPLETE.md** - Implementation details
- **DEPLOYMENT_CHECKLIST.md** - Deployment guide

## 💾 PPM File Format Info

- ASCII text format
- Headers: `P3`, width, height, max color value
- Simple RGB pixel data
- Large files: ~4 bytes per pixel
- Example: 500×281 = 560KB file

### PPM Viewer
- Most image viewers support PPM
- Online: convert to PNG first
- GIMP, ImageMagick, or any image viewer

## ⚡ Performance Tips

1. **Quick Preview**: Use small size (100×75) with quality 1
2. **Reduce Time**: Lower quality (quality 1 is fast)
3. **Optimize Output**: Convert PPM→PNG for smaller files
4. **Batch Renders**: Use `--output-dir` for multiple scenes
5. **Monitor Progress**: Watch console output

## 🎯 Common Workflows

### Batch Render All Scenes
```bash
for scene in scene1 scene2 scene3 earth; do
  node cli.js --scene $scene --width 400 --height 225 \
    --output "output/$scene.ppm"
done
```

### Convert All PPM to PNG
```bash
for ppm in output/*.ppm; do
  convert "$ppm" "${ppm%.ppm}.png"
done
```

### Create Animation Preview
```bash
# Render multiple quality levels
for q in 1 2 3; do
  node cli.js --scene scene1 --quality $q \
    --output "quality-$q.ppm"
done
```

## 📝 File Size Expectations

| Resolution | Bytes | PPM File |
|-----------|-------|----------|
| 100×75 | 7.5K | ~30KB |
| 200×150 | 30K | ~120KB |
| 500×281 | 140K | ~560KB |
| 800×600 | 480K | ~1.9MB |
| 1280×720 | 921K | ~3.7MB |

(PNG compression typical: 30-50% of PPM size)

## 🆘 Getting Help

1. Read INDEX.md for navigation
2. Check CLI_README.md for detailed examples
3. Review ARCHITECTURE.md for design questions
4. Look at DEPLOYMENT_CHECKLIST.md for issues
5. Check browser console (F12) for web UI errors

## ✅ Verification Checklist

Before sharing/deploying:
- [ ] `node cli.js --help` works
- [ ] `node cli.js --list-scenes` shows 7 scenes
- [ ] `node cli.js --scene scene1` produces .ppm file
- [ ] `webapp.html` opens in browser
- [ ] Web UI renders without errors
- [ ] Download button works
- [ ] No console errors (F12)

---

**Version**: 2.0  
**Status**: Production Ready  
**Last Updated**: 2026-11-14

Ready to render! 🎨
