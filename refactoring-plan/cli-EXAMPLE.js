// cli.js
// Node.js CLI interface for the raytracer
// This file handles command-line argument parsing and orchestration

// Only runs in Node.js
if (typeof window !== 'undefined') {

    console.error("cli.js should only run in Node.js!");
    process.exit(1);
}

var fs = require('fs');
var path = require('path');

// Parse command-line arguments
function parseArguments() {

    var args = process.argv.slice(2);
    var argv = {};
    
    for (var i = 0; i < args.length; i++) {
    
        var arg = args[i];
        
        if (arg.startsWith('--')) {
        
            var key = arg.substring(2).split('=')[0];
            var value = arg.includes('=') ? arg.split('=')[1] : args[++i];
            
            // Try to parse as number
            if (!isNaN(value) && value !== '') {
            
                value = parseFloat(value);
            }
            
            argv[key] = value;
        }
        else if (arg.startsWith('-')) {
        
            var key = arg.substring(1);
            var value = args[++i];
            argv[key] = value;
        }
    }
    
    return argv;
}

// Load a config file (JSON or YAML-like)
function loadConfigFile(configPath) {

    console.log("Loading config from: " + configPath);
    
    var content = fs.readFileSync(configPath, 'utf8');
    var config;
    
    if (configPath.endsWith('.json')) {
    
        config = JSON.parse(content);
    } else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
    
        // Simple YAML parser (enough for our needs)
        config = parseSimpleYAML(content);
    } else {
    
        throw new Error("Unknown config format: " + configPath);
    }
    
    return config;
}

function parseSimpleYAML(yamlString) {

    var config = {};
    var lines = yamlString.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
    
        var line = lines[i].trim();
        
        if (line === '' || line.startsWith('#'))
            continue;
        
        var parts = line.split(':');
        if (parts.length === 2) {
        
            var key = parts[0].trim();
            var value = parts[1].trim();
            
            // Try to parse value
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value)) value = parseFloat(value);
            
            config[key] = value;
        }
    }
    
    return config;
}

// Create a scene from config
function createSceneFromConfig(config) {

    console.log("Creating scene from config");
    
    var w = new world();
    
    // Light configuration
    if (config.light) {
    
        var lightCfg = config.light;
        w.light = new point_light(
        
            point(lightCfg.x || -20, lightCfg.y || 20, lightCfg.z || 40),
            colour(lightCfg.r || 1, lightCfg.g || 1, lightCfg.b || 1)
        );
    } else {
    
        w.light = new point_light(point(-20, 20, 40), colour(1, 1, 1));
    }
    
    w.objects = [];
    
    return w;
}

// Write PPM file
function writePPMFile(filePath, pixels, width, height) {

    console.log("Writing PPM file: " + filePath);
    
    var ppmData = "P3\n" + width + " " + height + "\n255\n";
    
    for (var i = 0; i < pixels.length; i++) {
    
        var rgb = colorTo255(pixels[i]);
        ppmData += rgb.r + " " + rgb.g + " " + rgb.b + "\n";
    }
    
    fs.writeFileSync(filePath, ppmData);
    
    var stats = fs.statSync(filePath);
    console.log("Wrote " + (stats.size / 1024).toFixed(2) + " KB to " + filePath);
}

// Main CLI handler
function main() {

    console.log("RTDT Raytracer - CLI");
    console.log("====================");
    
    var argv = parseArguments();
    
    // Handle help
    if (argv.help || argv.h) {
    
        printHelp();
        return;
    }
    
    // Validate inputs
    var sceneOrConfig = argv.scene || argv.config || argv.s || argv.c;
    if (!sceneOrConfig) {
    
        console.error("ERROR: Must specify --scene or --config");
        printHelp();
        process.exit(1);
    }
    
    var outputFile = argv.output || argv.o || 'render.ppm';
    var width = argv.width || argv.w || 500;
    var height = argv.height || argv.h || 281;
    var samples = argv.samples || 1;
    
    console.log("Scene/Config: " + sceneOrConfig);
    console.log("Output: " + outputFile);
    console.log("Size: " + width + "x" + height);
    console.log("Samples: " + samples);
    console.log("");
    
    try {
    
        // Initialize raytracer
        initRaytracer(width, height);
        
        // Create world/scene
        var world;
        if (argv.config || argv.c) {
        
            // Load from config file
            var config = loadConfigFile(sceneOrConfig);
            world = createSceneFromConfig(config);
        } else {
        
            // Get predefined scene
            world = new world();
            
            // Try to find scene function
            if (typeof getScene === 'function') {
            
                world = getScene(sceneOrConfig) || world;
            } else {
            
                throw new Error("Scene not found: " + sceneOrConfig);
            }
        }
        
        // Check if we have geometry
        if (!world.objects || world.objects.length === 0) {
        
            console.warn("WARNING: No objects in scene");
        }
        
        // Render
        var pixels = renderSceneSync(world, Data.c, samples);
        
        // Write output
        writePPMFile(outputFile, pixels, width, height);
        
        console.log("");
        console.log("SUCCESS: Render complete!");
        
    } catch (e) {
    
        console.error("ERROR: " + e.message);
        if (e.stack) {
        
            console.error(e.stack);
        }
        process.exit(1);
    }
}

function printHelp() {

    console.log("Usage: node cli.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  --scene, -s NAME          Load a predefined scene (e.g., scene1, scene2)");
    console.log("  --config, -c FILE         Load scene from config file (JSON or YAML)");
    console.log("  --output, -o FILE         Output file path (default: render.ppm)");
    console.log("  --width, -w N             Image width (default: 500)");
    console.log("  --height, -h N            Image height (default: 281)");
    console.log("  --samples N               Samples per pixel (default: 1)");
    console.log("  --help                    Show this help message");
    console.log("");
    console.log("Examples:");
    console.log("  node cli.js --scene scene1 --output render.ppm");
    console.log("  node cli.js --config scene.yaml --output render.ppm");
    console.log("  node cli.js -s scene1 -w 1024 -h 768 -o large.ppm");
}

// Only run if this is the main module
if (require.main === module) {

    main();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {

    module.exports = {
    
        parseArguments: parseArguments,
        loadConfigFile: loadConfigFile,
        createSceneFromConfig: createSceneFromConfig,
        writePPMFile: writePPMFile
    };
}
