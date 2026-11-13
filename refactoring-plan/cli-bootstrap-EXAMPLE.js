#!/usr/bin/env node
// cli-bootstrap.js
// Entry point for Node.js CLI
// This loads all modules in the correct order, then runs the CLI

// Ensure we're in Node.js
if (typeof window !== 'undefined') {
    throw new Error("cli-bootstrap.js should only run in Node.js!");
}

console.log("Loading RTDT modules...");

// Load all modules in correct order
// Order matters! Each file may depend on earlier files
require('./rt.math.js');
require('./rt.core.js');
require('./rt.matrix.js');
require('./rt.matrix-transform.js');
require('./rt.ray.js');
require('./rt.light.js');
require('./rt.material.js');
require('./rt.world.js');
require('./rt.shade.js');
require('./rt.p+e.js');
require('./rt.pattern.js');
// require('./rt.graphics.js');  // Skip graphics for CLI
require('./rt.objfile-node.js');   // Node.js OBJ loader
require('./rt.examples.js');       // Scene definitions

// Load shared rendering logic
require('./raytracer-core.js');

// Load CLI interface
require('./cli.js');

console.log("Modules loaded. Ready for rendering.");
