// cli.js
// Command-line interface for raytracer
// Handles argument parsing, scene rendering, and PPM output

// Global variable: will be set by argument parsing
var cliConfig = {

	sceneName: 'scene1',
	width: 500,
	height: 281,
	outputFile: 'render.ppm',
	quality: 1,
	verbose: true
};

function printHelp() {

	console.log(`
RTDT Ray Tracer - Command Line Interface

USAGE:
  node cli-bootstrap.js [OPTIONS]

OPTIONS:
  --scene NAME        Scene to render (default: scene1)
  --width NUM         Image width in pixels (default: 500)
  --height NUM        Image height in pixels (default: 281)
  --output FILE       PPM output file (default: render.ppm)
  --quality NUM       Render quality/samples (default: 1)
  --verbose           Verbose output (default: true)
  --help              Show this help message

EXAMPLES:
  # Render default scene
  node cli-bootstrap.js

  # Render scene1 at 900x550
  node cli-bootstrap.js --scene scene1 --width 900 --height 550

  # Small preview render
  node cli-bootstrap.js --scene scene1 --width 150 --height 84 --output preview.ppm

  # High quality render
  node cli-bootstrap.js --scene scene1 --quality 3 --output hires.ppm

AVAILABLE SCENES:
  scene1        Default scene
  mySkyBox      Sky box scene
  earth         Earth scene
  cm_cube       Cube scene
  endGame       End game scene

NOTES:
  - Output is P3 PPM format (plain text, can be large)
  - Rendering is synchronous (blocks until complete)
  - Progress logged every 10 lines

`);
}

function parseArguments(argv) {

	// argv[0] is 'node', argv[1] is 'cli-bootstrap.js'
	for (let i = 2; i < argv.length; i++) {
	
		const arg = argv[i];
		
		if (arg === '--help' || arg === '-h') {
		
			printHelp();
			process.exit(0);
		}
		else if (arg === '--scene' && i + 1 < argv.length) {
		
			cliConfig.sceneName = argv[++i];
		}
		else if (arg === '--width' && i + 1 < argv.length) {
		
			const w = parseInt(argv[++i], 10);
			if (isNaN(w) || w < 1) {
			
				console.error('Error: width must be a positive integer');
				process.exit(1);
			}
			cliConfig.width = w;
		}
		else if (arg === '--height' && i + 1 < argv.length) {
		
			const h = parseInt(argv[++i], 10);
			if (isNaN(h) || h < 1) {
			
				console.error('Error: height must be a positive integer');
				process.exit(1);
			}
			cliConfig.height = h;
		}
		else if (arg === '--output' && i + 1 < argv.length) {
		
			cliConfig.outputFile = argv[++i];
		}
		else if (arg === '--quality' && i + 1 < argv.length) {
		
			const q = parseInt(argv[++i], 10);
			if (isNaN(q) || q < 1) {
			
				console.error('Error: quality must be a positive integer');
				process.exit(1);
			}
			cliConfig.quality = q;
		}
		else if (arg === '--verbose' && i + 1 < argv.length) {
		
			cliConfig.verbose = argv[++i].toLowerCase() !== 'false';
		}
		else if (arg === '--no-verbose') {
		
			cliConfig.verbose = false;
		}
		else {
		
			console.error('Error: unknown option: ' + arg);
			process.exit(1);
		}
	}
}

function getScene(sceneName) {

	// scenes is defined by rtdt_examples.js
	if (typeof scenes === 'undefined') {
	
		throw new Error('Scene data not loaded');
	}
	
	if (typeof scenes[sceneName] !== 'function') {
	
		throw new Error('Scene not found: ' + sceneName + '. Available: ' + Object.keys(scenes).join(', '));
	}
	
	return scenes[sceneName];
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
		const sceneFunction = getScene(cliConfig.sceneName);
		sceneFunction();
		
		// Data.o should now contain the scene
		if (!Data.o || !Data.o.s) {
		
			throw new Error('Scene did not populate scene data');
		}
		
		// Create world for rendering
		const world = new world();
		world.light = Data.l;
		world.objects = Data.o.s;
		
		// Render synchronously
		const startTime = Date.now();
		const pixels = renderSceneSync(world, Data.c, cliConfig.quality);
		const elapsed = (Date.now() - startTime) / 1000;
		
		log('Render completed in ' + elapsed.toFixed(2) + ' seconds');
		log('');
		
		// Convert pixels to PPM and write file
		writePPMFile(cliConfig.outputFile, pixels);
		
	} catch (e) {
	
		console.error('Error during rendering:');
		console.error('  ' + e.message);
		if (e.stack) {
		
			console.error(e.stack);
		}
		process.exit(1);
	}
}

function writePPMFile(filename, pixels) {

	const fs = require('fs');
	
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

function log(message) {

	if (cliConfig.verbose) {
	
		console.log(message);
	}
}

function processCommandLine() {

	try {
	
		parseArguments(process.argv);
		renderScene();
		process.exit(0);
	} catch (e) {
	
		console.error('Fatal error: ' + e.message);
		process.exit(1);
	}
}
