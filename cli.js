#!/usr/bin/env node
// cli.js - Main CLI entry point for RTDT raytracer
// Loads all modules in correct dependency order, then handles CLI rendering

const path = require('path');
const fs = require('fs');
const vm = require('vm');

// ============================================================================
// MODULE LOADING
// ============================================================================

function loadScript(filePath) {

	try {
	
		let code = fs.readFileSync(filePath, 'utf8');
		
		// For rtdt_objfile-node.js, we need to strip the require() calls
		// since we're running in a different context
		if (filePath.includes('rtdt_objfile-node')) {
		
			// Replace require() calls with references to outer scope
			code = code.replace(/const fs = require\('fs'\);/g, '');
			code = code.replace(/const path = require\('path'\);/g, '');
			// fs and path are available in outer scope already
		}
		
		vm.runInThisContext(code);
	} catch (e) {
	
		console.error('✗ Failed to load ' + path.basename(filePath) + ':');
		console.error('  ' + e.message);
		process.exit(1);
	}
}

// Prevent browser APIs
if (typeof window !== 'undefined') {

	throw new Error('This CLI should not run in a browser');
}

const repoRoot = __dirname;

// Load in CORRECT dependency order
try {

	loadScript(path.join(repoRoot, 'rtdt_math.js'));
	loadScript(path.join(repoRoot, 'rtdt_core.js'));
	loadScript(path.join(repoRoot, 'rtdt_matrix-transform.js')); // Load first - provides multiply_matrix_by_tuple
	loadScript(path.join(repoRoot, 'rtdt_matrix.js'));        // Depends on rtdt_matrix-transform
	loadScript(path.join(repoRoot, 'rtdt_ray.js'));
	loadScript(path.join(repoRoot, 'rtdt_light.js'));
	loadScript(path.join(repoRoot, 'rtdt_material.js'));
	loadScript(path.join(repoRoot, 'rtdt_world.js'));
	loadScript(path.join(repoRoot, 'rtdt_shade.js'));
	loadScript(path.join(repoRoot, 'rtdt_p+e.js'));
	loadScript(path.join(repoRoot, 'rtdt_pattern.js'));
	loadScript(path.join(repoRoot, 'rtdt_tests.js'));
	loadScript(path.join(repoRoot, 'rtdt_examples.js'));
	loadScript(path.join(repoRoot, 'raytracer-core.js'));
	loadScript(path.join(repoRoot, 'rtdt_objfile-node.js'));
	loadScript(path.join(repoRoot, 'rtdt_ap_math.js'));
	loadScript(path.join(repoRoot, 'rtdt_aetherore.js'));
	
	// Create scenes object from loaded functions
	if (typeof global.scenes === 'undefined') {
	
		global.scenes = {
		
			scene1: typeof scene1 === 'function' ? scene1 : undefined,
			scene2: typeof scene2 === 'function' ? scene2 : undefined,
			scene3: typeof scene3 === 'function' ? scene3 : undefined,
			mySkyBox: typeof mySkyBox === 'function' ? mySkyBox : undefined,
			earth: typeof earth === 'function' ? earth : undefined,
			cm_cube: typeof cm_cube === 'function' ? cm_cube : undefined,
			endGame: typeof endGame === 'function' ? endGame : undefined
		};
	}
	
	// Provide stub functions for browser-only APIs
	if (typeof prepCanvas === 'undefined') {
	
		global.prepCanvas = function() { /* no-op for CLI */ };
	}
	if (typeof renderImage === 'undefined') {
	
		global.renderImage = function() { /* no-op for CLI - use renderSceneSync instead */ };
	}

} catch (e) {

	console.error('Failed to load modules: ' + e.message);
	process.exit(1);
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

// Global config
const cliConfig = {

	sceneName: 'scene1',
	width: 500,
	height: 281,
	outputFile: 'render.ppm',
	quality: 1,
	phyFile: null,
	phyTime: null,
	phyFrame: null,
	verbose: true
};

function printHelp() {

	console.log(`
RTDT Ray Tracer - Command Line Interface

USAGE:
  rtdt [OPTIONS]
  node cli.js [OPTIONS]

OPTIONS:
  --scene NAME        Scene to render (default: scene1)
  --phy FILE          Load .phy animation file (JSON version 1)
  --time SECONDS      Evaluate .phy at time t
  --frame INDEX       Evaluate .phy at frame INDEX (using timeline fps)
  --width NUM         Image width in pixels (default: 500)
  --height NUM        Image height in pixels (default: 281)
  --output FILE       PPM output file (default: render.ppm)
  --quality NUM       Render quality/samples (default: 1)
  --help              Show this help message
  --list-scenes       List available scenes

EXAMPLES:
  # Render default scene
  rtdt

  # Render scene1 at 900x550
  rtdt --scene scene1 --width 900 --height 550

  # Small preview render
  rtdt --scene scene1 --width 150 --height 84 --output preview.ppm

  # Animate the first scene object at t = 1.5 seconds
  rtdt --scene scene1 --phy motion.phy --time 1.5

  # High quality render (more samples)
  rtdt --scene scene1 --quality 3 --output hires.ppm

AVAILABLE SCENES:
  scene1              Default scene with primitives
  mySkyBox            Sky box scene
  earth               Earth scene
  cm_cube             Cube scene
  endGame             End game scene

NOTES:
  - Output is P3 PPM format (plain text)
  - Rendering is synchronous and may take time for high resolutions
  - PPM files can be converted to PNG using ImageMagick: convert render.ppm render.png

For interactive rendering, see webapp.html

`);
}

function listScenes() {

	if (typeof scenes === 'undefined' || typeof scenes !== 'object') {
	
		console.error('Scenes not loaded');
		process.exit(1);
	}
	
	const sceneList = Object.keys(scenes).sort();
	if (sceneList.length === 0) {
	
		console.error('No scenes available');
		process.exit(1);
	}
	
	console.log('Available scenes:\n');
	sceneList.forEach(function (name) {
	
		console.log('  ' + name);
	});
	console.log('');
}

function parseArguments(argv) {

	for (let i = 2; i < argv.length; i++) {
	
		const arg = argv[i];
		
		if (arg === '--help' || arg === '-h') {
		
			printHelp();
			process.exit(0);
		}
		else if (arg === '--list-scenes') {
		
			listScenes();
			process.exit(0);
		}
		else if (arg === '--scene' || arg === '-s') {
		
			if (i + 1 >= argv.length) {
			
				console.error('Error: --scene requires a value');
				process.exit(1);
			}
			cliConfig.sceneName = argv[++i];
		}
		else if (arg === '--phy' || arg === '--time' || arg === '--frame') {
		
			if (i + 1 >= argv.length)
				throw new Error(arg + ' requires a value');
			var raw = argv[++i];
			if (arg === '--phy')
				cliConfig.phyFile = raw;
			else {
				var value = Number(raw);
				if (!isFinite(value) || value < 0 ||
					(arg === '--frame' && Math.floor(value) !== value))
					throw new Error(arg + ' requires a nonnegative ' +
						(arg === '--frame' ? 'integer' : 'number'));
				if (arg === '--time') cliConfig.phyTime = value;
				else cliConfig.phyFrame = value;
			}
		}
		else if (arg === '--width' || arg === '-w') {
		
			if (i + 1 >= argv.length) {
			
				console.error('Error: --width requires a value');
				process.exit(1);
			}
			const w = parseInt(argv[++i], 10);
			if (isNaN(w) || w < 1) {
			
				console.error('Error: width must be a positive integer');
				process.exit(1);
			}
			cliConfig.width = w;
		}
		else if (arg === '--height' || arg === '-h') {
		
			if (i + 1 >= argv.length) {
			
				console.error('Error: --height requires a value');
				process.exit(1);
			}
			const h = parseInt(argv[++i], 10);
			if (isNaN(h) || h < 1) {
			
				console.error('Error: height must be a positive integer');
				process.exit(1);
			}
			cliConfig.height = h;
		}
		else if (arg === '--output' || arg === '-o') {
		
			if (i + 1 >= argv.length) {
			
				console.error('Error: --output requires a value');
				process.exit(1);
			}
			cliConfig.outputFile = argv[++i];
		}
		else if (arg === '--quality' || arg === '-q') {
		
			if (i + 1 >= argv.length) {
			
				console.error('Error: --quality requires a value');
				process.exit(1);
			}
			const q = parseInt(argv[++i], 10);
			if (isNaN(q) || q < 1) {
			
				console.error('Error: quality must be a positive integer');
				process.exit(1);
			}
			cliConfig.quality = q;
		}
		else {
		
			console.error('Error: unknown option: ' + arg);
			console.error('Use --help for usage information');
			process.exit(1);
		}
	}
}

function log(message) {

	if (cliConfig.verbose) {
	
		console.log(message);
	}
}

function renderScene() {

	try {
	
		log('Rendering scene: ' + cliConfig.sceneName);
		log('Resolution: ' + cliConfig.width + 'x' + cliConfig.height);
		log('Quality: ' + cliConfig.quality);
		log('');
		
		// Set rendering dimensions
		WIDTH = cliConfig.width;
		HEIGHT = cliConfig.height;
		
		// Initialize raytracer
		initRaytracer(WIDTH, HEIGHT);
		
		// Get and run the scene function
		if (typeof scenes === 'undefined' || typeof scenes[cliConfig.sceneName] !== 'function') {
		
			const available = typeof scenes === 'object' ? Object.keys(scenes).join(', ') : 'none';
			throw new Error('Scene not found: ' + cliConfig.sceneName + '. Available: ' + available);
		}
		
		const sceneFunction = scenes[cliConfig.sceneName];
		sceneFunction();
		
		// Data.o should now contain the scene
		if (!Data.o || !Data.o.s) {
		
			throw new Error('Scene did not populate scene data');
		}
		
		// Optional AetherOre animation: numeric string indices ("0", "1", ...)
		// refer to the top-level objects in Data.o.s.
		if (cliConfig.phyFile) {
		
			if (!/\.phy$/i.test(cliConfig.phyFile))
				throw new Error('Expected a .phy animation file');
			var phy = rtdt_aetherore.parse_phy(fs.readFileSync(cliConfig.phyFile, 'utf8'));
			var bindings = {};
			Data.o.s.forEach(function (shape, index) {
			
				bindings[String(index)] = shape;
				if (shape.id2 && !Object.prototype.hasOwnProperty.call(bindings,String(shape.id2)))
					bindings[String(shape.id2)] = shape;
			});
			if (cliConfig.phyFrame !== null && cliConfig.phyTime !== null)
				throw new Error('Choose either --time or --frame, not both');
			var fps = phy.timeline && phy.timeline.fps || 30;
			var t = cliConfig.phyTime !== null ? cliConfig.phyTime :
				(cliConfig.phyFrame !== null ? cliConfig.phyFrame / fps : 0);
			rtdt_aetherore.create_animator(phy, bindings).at(t);
			log('AetherOre: ' + cliConfig.phyFile + ' at t=' + t + 's');
		}
		else if (cliConfig.phyTime !== null || cliConfig.phyFrame !== null)
			throw new Error('--time/--frame requires --phy');
		
		// Create world for rendering
		const renderWorld = new world();
		renderWorld.light = Data.l;
		renderWorld.objects = Data.o.s;
		
		// Render synchronously
		const startTime = Date.now();
		const pixels = renderSceneSync(renderWorld, Data.c, cliConfig.quality);
		const elapsed = (Date.now() - startTime) / 1000;
		
		log('Render completed in ' + elapsed.toFixed(2) + ' seconds');
		log('');
		
		// Convert pixels to PPM and write file
		writePPMFile(cliConfig.outputFile, pixels);
		
	} catch (e) {
	
		console.error('Error during rendering:');
		console.error('  ' + e.message);
		if (process.env.DEBUG) {
		
			console.error(e.stack);
		}
		process.exit(1);
	}
}

function writePPMFile(filename, pixels) {

	if (!pixels || pixels.length === 0) {
	
		throw new Error('No pixels to write');
	}
	
	if (pixels.length !== WIDTH * HEIGHT) {
	
		throw new Error('Pixel count mismatch: expected ' + (WIDTH * HEIGHT) + ', got ' + pixels.length);
	}
	
	try {
	
		// PPM P3 format (plain text)
		let ppmData = 'P3\n';
		ppmData += WIDTH + ' ' + HEIGHT + '\n';
		ppmData += '255\n';
		
		// Write pixels
		let pixelIndex = 0;
		for (let y = 0; y < HEIGHT; y++) {
		
			let line = '';
			for (let x = 0; x < WIDTH; x++) {
			
				const c = pixels[pixelIndex++];
				const rgb = colorTo255(c);
				
				line += rgb.r + ' ' + rgb.g + ' ' + rgb.b + '  ';
			}
			ppmData += line + '\n';
		}
		
		// Write to file
		fs.writeFileSync(filename, ppmData, 'utf8');
		
		const stats = fs.statSync(filename);
		const sizeKB = (stats.size / 1024).toFixed(1);
		
		log('✓ PPM file written: ' + filename + ' (' + sizeKB + ' KB)');
		
	} catch (e) {
	
		throw new Error('Failed to write PPM file: ' + e.message);
	}
}

function main() {

	try {
	
		parseArguments(process.argv);
		renderScene();
		process.exit(0);
	} catch (e) {
	
		console.error('Fatal error: ' + e.message);
		if (process.env.DEBUG) {
		
			console.error(e.stack);
		}
		process.exit(1);
	}
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {

	main();
}

module.exports = {

	renderScene,
	parseArguments,
	cliConfig,
	listScenes
};
