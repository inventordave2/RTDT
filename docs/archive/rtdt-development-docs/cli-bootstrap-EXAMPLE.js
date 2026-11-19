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
require('./rtdt_math.js');
require('./rtdt_core.js');
require('./rtdt_matrix.js');
require('./rtdt_matrix-transform.js');
require('./rtdt_ray.js');
require('./rtdt_light.js');
require('./rtdt_material.js');
require('./rtdt_world.js');
require('./rtdt_shade.js');
require('./rtdt_p+e.js');
require('./rtdt_pattern.js');
// require('./rtdt_graphics.js');  // Skip graphics for CLI
require('./rtdt_objfile-node.js');   // Node.js OBJ loader
require('./rtdt_examples.js');       // Scene definitions

// Load shared rendering logic
require('./raytracer-core.js');

// Load CLI interface
require('./cli.js');

console.log("Modules loaded. Ready for rendering.");
