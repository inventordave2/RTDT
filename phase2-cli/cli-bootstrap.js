#!/usr/bin/env node
// cli-bootstrap.js
// Node.js entry point for raytracer CLI
// Loads all modules in correct dependency order

const path = require('path');
const fs = require('fs');

// Helper to load a script file into global scope
function loadScript(filePath) {
	try {
		const code = fs.readFileSync(filePath, 'utf8');
		// eval executes in this scope, making functions/vars global
		eval(code);
		console.log('✓ Loaded: ' + path.basename(filePath));
	} catch (e) {
		console.error('✗ Failed to load ' + path.basename(filePath) + ':');
		console.error('  ' + e.message);
		process.exit(1);
	}
}

// Base path to the repo root
const repoRoot = path.join(__dirname, '..');

console.log('Initializing raytracer...\n');

// Load in correct dependency order
// Level 0: Pure math utilities
loadScript(path.join(repoRoot, 'rt.p+e.js'));
loadScript(path.join(repoRoot, 'rt.pattern.js'));
loadScript(path.join(repoRoot, 'rt.math.js'));

// Level 1: Matrix/vector operations
loadScript(path.join(repoRoot, 'rt.matrix-transform.js'));
loadScript(path.join(repoRoot, 'rt.matrix.js'));

// Level 2: Tests and world
loadScript(path.join(repoRoot, 'rt.tests.js'));
loadScript(path.join(repoRoot, 'rt.world.js'));

// Level 3: Shading and rendering
loadScript(path.join(repoRoot, 'rt.shade.js'));
loadScript(path.join(repoRoot, 'rt.core.js'));
loadScript(path.join(repoRoot, 'rt.light.js'));

// Level 4: Shared core logic (platform-agnostic)
loadScript(path.join(repoRoot, 'raytracer-core.js'));

// Level 5: Examples and materials
loadScript(path.join(repoRoot, 'rt.examples.js'));
loadScript(path.join(repoRoot, 'rt.material.js'));

// Level 6: Ray operations
loadScript(path.join(repoRoot, 'rt.ray.js'));

// Level 7: Graphics (browser version won't work, but provides utility functions)
// Skip rt.graphics.js (browser-only)

// Level 8: File I/O (Node.js version)
loadScript(path.join(__dirname, 'rt.objfile-node.js'));

// Level 9: CLI interface
loadScript(path.join(__dirname, 'cli.js'));

console.log('\n✓ All modules loaded\n');

// Parse command line and run
processCommandLine();
