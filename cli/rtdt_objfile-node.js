// rt.objfile-node.js
// Node.js implementation of OBJ file parsing
// Replaces browser-based FileReader API with fs module

const fs = require('fs');
const path = require('path');

// Global OBJ file contents (set by loadOBJFile)
var OBJFILECONTENTS = '';

function loadOBJFile(filepath) {
	try {
		if (!fs.existsSync(filepath)) {
			throw new Error('File not found: ' + filepath);
		}
		
		OBJFILECONTENTS = fs.readFileSync(filepath, 'utf8');
		console.log('Loaded OBJ file: ' + path.basename(filepath));
		
		return true;
	} catch (e) {
		console.error('Error loading OBJ file: ' + e.message);
		return false;
	}
}

function parse_obj_file() {
	// Parse OBJ file from OBJFILECONTENTS
	// Populates Data.v, Data.vn, Data.f
	
	if (!OBJFILECONTENTS) {
		console.error('No OBJ file contents to parse');
		return false;
	}
	
	try {
		// Initialize arrays
		Data.v = [];   // vertices
		Data.vn = [];  // vertex normals
		Data.f = [];   // faces
		
		const lines = OBJFILECONTENTS.split('\n');
		let vertexCount = 0;
		let normalCount = 0;
		let faceCount = 0;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			
			// Skip comments and empty lines
			if (!line || line.startsWith('#')) {
				continue;
			}
			
			// Vertex position: v x y z
			if (line.startsWith('v ')) {
				const parts = line.split(/\s+/).slice(1);
				if (parts.length >= 3) {
					const x = parseFloat(parts[0]);
					const y = parseFloat(parts[1]);
					const z = parseFloat(parts[2]);
					
					if (isFinite(x) && isFinite(y) && isFinite(z)) {
						Data.v.push(point(x, y, z));
						vertexCount++;
					}
				}
			}
			
			// Vertex normal: vn x y z
			else if (line.startsWith('vn ')) {
				const parts = line.split(/\s+/).slice(1);
				if (parts.length >= 3) {
					const x = parseFloat(parts[0]);
					const y = parseFloat(parts[1]);
					const z = parseFloat(parts[2]);
					
					if (isFinite(x) && isFinite(y) && isFinite(z)) {
						Data.vn.push(normalize(vector(x, y, z)));
						normalCount++;
					}
				}
			}
			
			// Face: f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 ...
			else if (line.startsWith('f ')) {
				const faceData = line.substring(2).trim();
				Data.f.push(faceData);
				faceCount++;
			}
		}
		
		console.log('Parsed OBJ: ' + vertexCount + ' vertices, ' + normalCount + ' normals, ' + faceCount + ' faces');
		
		return true;
		
	} catch (e) {
		console.error('Error parsing OBJ file: ' + e.message);
		return false;
	}
}

function createTriangleFromFace(faceStr, vertexArray, normalArray) {
	// Parse a face string and create a triangle
	// Format: "v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3"
	// For now, just use vertex positions (ignore texture coords)
	
	const vertices = faceStr.split(/\s+/);
	
	if (vertices.length < 3) {
		console.error('Face has fewer than 3 vertices');
		return null;
	}
	
	try {
		const p1 = parseVertexIndex(vertices[0], vertexArray);
		const p2 = parseVertexIndex(vertices[1], vertexArray);
		const p3 = parseVertexIndex(vertices[2], vertexArray);
		
		if (!p1 || !p2 || !p3) {
			console.error('Failed to parse face indices');
			return null;
		}
		
		// Create triangle with default material
		const tri = triangle(p1, p2, p3);
		tri.material = material();
		
		return tri;
		
	} catch (e) {
		console.error('Error creating triangle: ' + e.message);
		return null;
	}
}

function parseVertexIndex(vertexStr, vertexArray) {
	// Parse "v/vt/vn" or "v//vn" or "v/vt" or "v"
	// Return point from vertexArray[v-1]
	
	const parts = vertexStr.split('/');
	if (!parts[0]) {
		return null;
	}
	
	const vIndex = parseInt(parts[0], 10) - 1; // OBJ indices are 1-based
	
	if (vIndex < 0 || vIndex >= vertexArray.length) {
		console.error('Vertex index out of range: ' + (vIndex + 1));
		return null;
	}
	
	return vertexArray[vIndex];
}

function loadOBJScene(filepath, materialOverride) {
	// Load an OBJ file and create a scene from it
	
	if (!loadOBJFile(filepath)) {
		return null;
	}
	
	if (!parse_obj_file()) {
		return null;
	}
	
	// Create triangles from faces
	const triangles = [];
	
	for (let i = 0; i < Data.f.length; i++) {
		const tri = createTriangleFromFace(Data.f[i], Data.v, Data.vn);
		if (tri) {
			if (materialOverride) {
				tri.material = materialOverride;
			}
			triangles.push(tri);
		}
	}
	
	console.log('Created ' + triangles.length + ' triangles from OBJ');
	
	// Return a group containing all triangles
	const objGroup = group();
	for (let i = 0; i < triangles.length; i++) {
		objGroup.addChild(triangles[i]);
	}
	
	return objGroup;
}
