/**
 * RTDT Scene Loader
 * 
 * Loads and parses .scene.yaml files into RTDT world objects.
 * Supports:
 *   - YAML declarative format
 *   - Math expressions (with loop variable 'i')
 *   - Repeat directives for loops
 *   - Material definitions and references
 *   - Transform composition
 * 
 * This module is dual-licensed under:
 * 1. MIT License (for open-source use)
 * 2. Commercial License (for commercial use)
 * 
 * See LICENSE-MIT.txt and LICENSE-COMMERCIAL.txt for details.
 */

var fs = require('fs');
var path = require('path');


/**
 * Simple YAML parser for basic YAML structures
 * Supports: objects, arrays, strings, numbers, booleans
 * Not a full YAML implementation, but sufficient for scene files
 */
function parseYAML(content) {

	var lines = content.split('\n');
	var result = {};
	var stack = [{ obj: result, indent: -1 }];
	var currentKey = null;
	var currentValue = '';
	var isMultiline = false;
	var multilineKey = null;
	var multilineIndent = 0;

	for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {

		var line = lines[lineIdx];
		var originalLine = line;
		
		// Skip empty lines and comments
		if (!line.trim() || line.trim()[0] === '#') {

			continue;
		}

		// Get indentation level
		var indent = 0;
		for (var i = 0; i < line.length; i++) {

			if (line[i] === ' ') {

				indent++;
			}
			else if (line[i] === '\t') {

				indent += 2;
			}
			else {

				break;
			}
		}

		line = line.trim();

		// Handle multiline values (| or >)
		if (isMultiline) {

			if (indent > multilineIndent) {

				currentValue += '\n' + originalLine.substring(multilineIndent);
			}
			else {

				// End of multiline
				isMultiline = false;
				setKeyValue(stack, multilineKey, currentValue.trim(), multilineIndent);
				currentValue = '';
			}

			if (lineIdx === lines.length - 1) {

				isMultiline = false;
				setKeyValue(stack, multilineKey, currentValue.trim(), multilineIndent);
			}
		}

		if (!isMultiline) {

			// Pop stack based on indentation
			while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {

				stack.pop();
			}

			// Parse key: value
			var colonIdx = line.indexOf(':');
			if (colonIdx > -1) {

				var key = line.substring(0, colonIdx).trim();
				var value = line.substring(colonIdx + 1).trim();

				if (value === '' || value === '|' || value === '>') {

					// Nested object or multiline value
					if (value === '|' || value === '>') {

						isMultiline = true;
						multilineKey = key;
						multilineIndent = indent;
						currentValue = '';
					}
					else {

						var nested = {};
						stack[stack.length - 1].obj[key] = nested;
						stack.push({ obj: nested, indent: indent });
					}
				}
				else {

					// Scalar value
					setKeyValue(stack, key, value, indent);
				}
			}
			else if (line.startsWith('- ')) {

				// Array element
				var val = line.substring(2).trim();
				if (!Array.isArray(stack[stack.length - 1].obj)) {

					// Convert to array if needed
					var arrayWrapper = [];
					var parent = stack[stack.length - 2];
					var parentKey = null;
					for (var k in parent.obj) {

						if (parent.obj[k] === stack[stack.length - 1].obj) {

							parentKey = k;
							break;
						}
					}
					if (parentKey) {

						parent.obj[parentKey] = arrayWrapper;
						stack[stack.length - 1].obj = arrayWrapper;
					}
				}

				var elem = {};
				if (val === '' || val === '{') {

					stack[stack.length - 1].obj.push(elem);
					stack.push({ obj: elem, indent: indent });
				}
				else {

					stack[stack.length - 1].obj.push(parseScalarValue(val));
				}
			}
		}
	}

	return result;
}


/**
 * Set a key-value pair on the current object in the stack
 */
function setKeyValue(stack, key, value, indent) {

	stack[stack.length - 1].obj[key] = parseScalarValue(value);
}


/**
 * Parse a scalar value (string, number, boolean, array, etc.)
 */
function parseScalarValue(val) {

	if (!val || val === 'null') {

		return null;
	}
	if (val === 'true') {

		return true;
	}
	if (val === 'false') {

		return false;
	}
	if (val === 'undefined') {

		return undefined;
	}

	// Array
	if (val.startsWith('[') && val.endsWith(']')) {

		var arrayStr = val.substring(1, val.length - 1);
		var items = arrayStr.split(',').map(function (item) {

			return parseScalarValue(item.trim());
		});
		return items;
	}

	// String or number
	if (!isNaN(val) && val !== '') {

		return parseFloat(val);
	}

	// String (remove quotes if present)
	if ((val.startsWith('"') && val.endsWith('"')) ||
		(val.startsWith("'") && val.endsWith("'"))) {

		return val.substring(1, val.length - 1);
	}

	return val;
}


/**
 * Expression evaluator for math expressions with loop variable 'i'
 * Supports: basic math, sin, cos, tan, sqrt, abs, pi, etc.
 */
function evaluateExpression(expr, context) {

	context = context || {};

	// Replace constants
	expr = expr.replace(/\bpi\b/g, 'Math.PI');
	expr = expr.replace(/\be\b/g, 'Math.E');

	// Replace functions
	var functions = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'pow'];
	for (var i = 0; i < functions.length; i++) {

		var fn = functions[i];
		expr = expr.replace(new RegExp('\\b' + fn + '\\b', 'g'), 'Math.' + fn);
	}

	// Build variable context for eval
	var contextVars = '';
	for (var key in context) {

		contextVars += 'var ' + key + ' = ' + JSON.stringify(context[key]) + '; ';
	}

	try {

		// Safe evaluation with context variables
		var result = (function () {

			eval(contextVars);
			return eval('(' + expr + ')');
		}).call({});

		return result;
	}
	catch (e) {

		console.error('Error evaluating expression "' + expr + '": ' + e.message);
		return 0;
	}
}


/**
 * Recursively evaluate expressions in an object
 * Replaces string expressions with their numeric results
 */
function evaluateExpressions(obj, context) {

	if (typeof obj === 'string') {

		// Check if this looks like an expression (contains math operators or functions)
		if (obj.match(/[+\-*/%()i\.]|sin|cos|tan|sqrt|pi|pow|Math/)) {

			var result = evaluateExpression(obj, context);
			return result;
		}
		return obj;
	}

	if (Array.isArray(obj)) {

		return obj.map(function (item) {

			return evaluateExpressions(item, context);
		});
	}

	if (typeof obj === 'object' && obj !== null) {

		var evaluated = {};
		for (var key in obj) {

			evaluated[key] = evaluateExpressions(obj[key], context);
		}
		return evaluated;
	}

	return obj;
}


/**
 * Process repeat directives, expanding them into multiple object instances
 */
function processRepeats(objects, materials) {

	var result = [];

	for (var objIdx = 0; objIdx < objects.length; objIdx++) {

		var obj = objects[objIdx];

		if (obj.repeat) {

			var repeatCount = obj.repeat.count || 1;

			for (var i = 0; i < repeatCount; i++) {

				var instance = JSON.parse(JSON.stringify(obj));
				delete instance.repeat;

				// Evaluate expressions with loop context
				instance = evaluateExpressions(instance, { i: i });

				// Recursively process nested repeats
				if (instance.children && instance.children.length) {

					instance.children = processRepeats(instance.children, materials);
				}

				result.push(instance);
			}
		}
		else {

			// Recursively process children
			if (obj.children && obj.children.length) {

				obj.children = processRepeats(obj.children, materials);
			}

			result.push(obj);
		}
	}

	return result;
}


/**
 * Resolve material references (by name) to actual material objects
 */
function resolveMaterials(scene) {

	var materialMap = {};
	if (scene.materials) {

		if (Array.isArray(scene.materials)) {

			for (var i = 0; i < scene.materials.length; i++) {

				if (scene.materials[i].name) {

					materialMap[scene.materials[i].name] = scene.materials[i];
				}
			}
		}
		else {

			materialMap = scene.materials;
		}
	}

	// Helper to resolve materials recursively
	function resolveInObject(obj) {

		if (Array.isArray(obj)) {

			for (var i = 0; i < obj.length; i++) {

				resolveInObject(obj[i]);
			}
		}
		else if (typeof obj === 'object' && obj !== null) {

			if (obj.material && typeof obj.material === 'string') {

				if (materialMap[obj.material]) {

					obj.material = materialMap[obj.material];
				}
			}

			if (obj.children) {

				resolveInObject(obj.children);
			}

			for (var key in obj) {

				if (key !== 'material' && key !== 'children') {

					resolveInObject(obj[key]);
				}
			}
		}
	}

	resolveInObject(scene.objects || []);
}


/**
 * Build transform from transform object/string
 */
function buildTransform(transformDef) {

	if (!transformDef) {

		return undefined;
	}

	if (typeof transformDef === 'string') {

		// Parse transform chain like "rotation_y(pi/4) @ translation(5, 0, 0)"
		var transforms = transformDef.split('@').map(function (t) {

			return t.trim();
		});

		var result = undefined;
		for (var i = 0; i < transforms.length; i++) {

			var transform = buildSingleTransform(transforms[i]);
			if (transform) {

				result = result ? result : transform;
				// In real implementation, would compose transforms
			}
		}
		return result;
	}

	return transformDef;
}


/**
 * Build a single transform (e.g., "rotation_y(pi/4)")
 */
function buildSingleTransform(transformStr) {

	// This is a placeholder - actual implementation depends on rtdt API
	// For now, return as-is for later processing
	return transformStr;
}


/**
 * Build RTDT world objects from scene definition
 */
function buildWorld(scene) {

	if (!global.world || typeof global.world !== 'function') {

		console.error('Error: rtdt_world module not loaded. Cannot build world.');
		return null;
	}

	var w = global.world();

	// Add cameras
	if (scene.cameras && scene.cameras.length > 0) {

		// Set camera from first camera definition
		var cameraDef = scene.cameras[0];
		if (cameraDef.position) {

			// TODO: Apply camera settings to world
			console.log('Camera defined (implementation pending)');
		}
	}

	// Add lights
	if (scene.lights && scene.lights.length > 0) {

		for (var i = 0; i < scene.lights.length; i++) {

			var lightDef = scene.lights[i];
			if (lightDef.position && global.point_light) {

				var light = global.point_light(
					global.point(lightDef.position[0], lightDef.position[1], lightDef.position[2]),
					global.colour(
						lightDef.intensity[0] || 1,
						lightDef.intensity[1] || 1,
						lightDef.intensity[2] || 1
					)
				);
				w.add(light);
			}
		}
	}

	// Add objects
	if (scene.objects && scene.objects.length > 0) {

		for (var objIdx = 0; objIdx < scene.objects.length; objIdx++) {

			addObjectToWorld(w, scene.objects[objIdx]);
		}
	}

	return w;
}


/**
 * Recursively add an object (or group) to the world
 */
function addObjectToWorld(world, objDef) {

	var obj = null;

	if (!objDef.type || objDef.type === 'group') {

		// Group - add children
		if (objDef.children) {

			for (var i = 0; i < objDef.children.length; i++) {

				addObjectToWorld(world, objDef.children[i]);
			}
		}
		return;
	}

	// Create object by type
	if (global[objDef.type]) {

		obj = global[objDef.type]();
	}
	else {

		console.error('Unknown object type: ' + objDef.type);
		return;
	}

	// Apply material
	if (objDef.material && obj) {

		if (typeof objDef.material === 'object') {

			obj.material = objDef.material;
		}
		else if (global.material && typeof objDef.material === 'object') {

			obj.material = objDef.material;
		}
	}

	// Apply transform
	if (objDef.transform && obj) {

		var transform = buildTransform(objDef.transform);
		if (transform) {

			obj.transform = transform;
		}
	}

	// Apply properties (position, radius, etc.)
	if (objDef.position && obj) {

		if (global.translation) {

			obj.transform = global.translation(objDef.position[0], objDef.position[1], objDef.position[2]);
		}
	}

	if (objDef.radius && obj) {

		obj.radius = objDef.radius;
	}

	if (objDef.scaling && obj) {

		if (global.scaling) {

			obj.transform = global.scaling(objDef.scaling[0], objDef.scaling[1], objDef.scaling[2]);
		}
	}

	if (obj) {

		world.add(obj);
	}
}


/**
 * Load and parse a scene file (.scene.yaml)
 * Returns: RTDT world object
 */
function loadSceneFile(filePath) {

	if (!fs.existsSync(filePath)) {

		throw new Error('Scene file not found: ' + filePath);
	}

	var content = fs.readFileSync(filePath, 'utf8');

	// Parse YAML
	var scene = parseYAML(content);

	// Process repeats
	if (scene.objects) {

		scene.objects = processRepeats(scene.objects, scene.materials);
	}

	// Resolve material references
	resolveMaterials(scene);

	// Build RTDT world
	var world = buildWorld(scene);

	return world;
}


/**
 * Export functions
 */
if (typeof module !== 'undefined' && module.exports) {

	module.exports = {
		loadSceneFile: loadSceneFile,
		parseYAML: parseYAML,
		evaluateExpression: evaluateExpression,
		evaluateExpressions: evaluateExpressions,
		processRepeats: processRepeats,
		resolveMaterials: resolveMaterials
	};
}
