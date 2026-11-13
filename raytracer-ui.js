// raytracer-ui.js
// BROWSER-ONLY UI code
// This file is loaded ONLY in browsers, never in Node.js

// Check we're in a browser
if (typeof window === 'undefined') {
	throw new Error("raytracer-ui.js should only be loaded in browsers!");
}

var ctx;
var loop;

/** Initialize UI when DOM is ready */
function initUI() {
	let c = document.getElementById("canvas");
	ctx = c.getContext("2d");
	
	initRaytracer(CANVAS_WIDTH, CANVAS_HEIGHT);
	
	ctx.fillStyle = BGCOLOR;
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	
	populateCameraMenu();
	console.log("UI initialized");
}

// Run init when DOM is loaded
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initUI);
} else {
	initUI();
}

function optionSelected() {
	var ct;
	switch(document.getElementById("os").selectedIndex) {
		case 0:
			WIDTH = 150;
			HEIGHT = Math.round(150*(9/16));
			ct = Data.c.transform;
			Data.c = new camera(WIDTH, HEIGHT, (Math.PI/4));
			Data.c.setCTransform(ct);
			break;
		
		case 1:
			WIDTH = 500;
			HEIGHT = Math.round(500*(9/16));
			ct = Data.c.transform;
			Data.c = new camera(WIDTH, HEIGHT, (Math.PI/4));
			Data.c.setCTransform(ct);
			break;
			
		case 2:
			WIDTH = 900;
			HEIGHT = 550;
			ct = Data.c.transform;
			Data.c = new camera(WIDTH, HEIGHT, (Math.PI/4));
			Data.c.setCTransform(ct);
			break;
			
		default:
	}
}

function camPresetSelected() {
	var v = document.getElementById("campresets");
	Data.c.setCTransform(Data.presets.camera[v.selectedIndex]);
	populateCameraMenu();
	console.log("Set Camera to preset " + (v.selectedIndex+1) + ".");
}

function sceneCameraBounds() {
	if (!Data.o || typeof Data.o.parent_space_bounds_of !== "function")
		return undefined;

	var bounds = Data.o.parent_space_bounds_of();
	if (bounds.min.x > bounds.max.x || bounds.min.y > bounds.max.y || bounds.min.z > bounds.max.z)
		return undefined;
	return bounds;
}

function boundsCenter(min, max) {
	if (isFinite(min) && isFinite(max))
		return min + (max - min) / 2;
	if (isFinite(min))
		return min;
	if (isFinite(max))
		return max;
	return 0;
}

function formatCameraValue(value) {
	if (value === Infinity)
		return "Infinity";
	if (value === -Infinity)
		return "-Infinity";
	if (!isFinite(value))
		return "Unknown";
	return String(Math.round(value * 100) / 100);
}

function setCameraVectorFields(prefix, value) {
	document.getElementById(prefix + "-x").value = formatCameraValue(value.x);
	document.getElementById(prefix + "-y").value = formatCameraValue(value.y);
	document.getElementById(prefix + "-z").value = formatCameraValue(value.z);
}

function populateCameraMenu() {
	var cameraPosition = multiply_matrix_by_tuple(inverse(Data.c.transform), point(0, 0, 0));
	setCameraVectorFields("cam-from", cameraPosition);
	
	var bounds = sceneCameraBounds();
	var center = point(0, 0, 0);
	var info = "No scene loaded.";
	if (bounds) {
		center = point(
			boundsCenter(bounds.min.x, bounds.max.x),
			boundsCenter(bounds.min.y, bounds.max.y),
			boundsCenter(bounds.min.z, bounds.max.z)
		);
		info = "Global bounds: min (" + formatCameraValue(bounds.min.x) + ", " + formatCameraValue(bounds.min.y) + ", " + formatCameraValue(bounds.min.z) + ")" +
			" max (" + formatCameraValue(bounds.max.x) + ", " + formatCameraValue(bounds.max.y) + ", " + formatCameraValue(bounds.max.z) + ")\n" +
			"Dimensions: " + formatCameraValue(bounds.max.x - bounds.min.x) + " x " + formatCameraValue(bounds.max.y - bounds.min.y) + " x " + formatCameraValue(bounds.max.z - bounds.min.z) + "\n" +
			"Center: (" + formatCameraValue(center.x) + ", " + formatCameraValue(center.y) + ", " + formatCameraValue(center.z) + ")";
	}
	setCameraVectorFields("cam-to", center);
	document.getElementById("camera-scene-info").textContent = info;
	document.getElementById("cam-fov").value = formatCameraValue(Data.c.fov * 180 / Math.PI);
}

function cameraFieldValue(id) {
	var value = parseFloat(document.getElementById(id).value);
	if (!isFinite(value))
		throw new Error("Enter a valid number for " + id + ".");
	return value;
}

function applyCameraSettings() {
	try {
		var from = point(cameraFieldValue("cam-from-x"), cameraFieldValue("cam-from-y"), cameraFieldValue("cam-from-z"));
		var to = point(cameraFieldValue("cam-to-x"), cameraFieldValue("cam-to-y"), cameraFieldValue("cam-to-z"));
		var fov = cameraFieldValue("cam-fov");
		if (fov <= 0 || fov >= 180)
			throw new Error("Field of view must be between 0 and 180 degrees.");
		if (from.x === to.x && from.y === to.y && from.z === to.z)
			throw new Error("Camera position and look-at point must differ.");
		
		var direction = normalize(subtract(to, from));
		var up = Math.abs(direction.y) > 0.999 ? vector(0, 0, 1) : vector(0, 1, 0);
		Data.c = new camera(WIDTH, HEIGHT, fov * Math.PI / 180);
		Data.c.setCTransform(view_transform(from, to, up));
		camModal.style.display = "none";
		if (Data.o && Data.o.s && Data.o.s.length)
			renderImage();
		return true;
	}
	catch (error) {
		showDialog(error.message);
		return false;
	}
}

/** RENDERING TO CANVAS */

function renderImage() {
	console.log("Starting render to canvas...");
	console.time("render");
	
	// Use async render that updates canvas
	g_c = Data.c;
	g_w = new world();
	g_w.light = Data.l;
	g_w.objects = (Data.o && Data.o.s) ? Data.o.s : [Data.o];
	g_r = 1;
	g_x = 0;
	g_y = 0;
	g_pixels = [];
	
	ctx.fillStyle = BGCOLOR;
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	
	renderCanvasLine();
}

function renderCanvasLine() {
	g_x = 0;
	while(g_x != WIDTH) {
		let r = g_c.ray_for_pixel(g_x, g_y);
		let c = color_at(g_w, r, g_r);
		
		if ((c.x==0) && (c.y==0) && (c.z==0))
			c = RENDER_BG_COLOR;
		
		c = convert(c);
		ctx.fillStyle = "#" + c.x + c.y + c.z;
		
		var x = g_x + ((CANVAS_WIDTH/2) - WIDTH/2);
		var y = g_y + ((CANVAS_HEIGHT/2) - HEIGHT/2);
		
		ctx.fillRect(x, y, 1, 1);
		
		g_x++;
	}

	g_x = 0;
	g_y++;
			
	if (g_y === HEIGHT) {
		console.log("COMPLETED RENDER.");
		console.timeEnd("render");
		return;
	}
	
	to = setTimeout(renderCanvasLine, 0);
}

/** FILE HANDLING */

var OBJFILECONTENTS = "";
var FILECONTENTS = "";

function showDialog(message) {
	var dialog = document.getElementById("app-dialog");
	document.getElementById("app-dialog-message").textContent = message;
	dialog.style.display = "block";
	document.getElementById("app-dialog-close").focus();
}

function closeDialog() {
	document.getElementById("app-dialog").style.display = "none";
}

function readObjectFile(e) {
	var file = e.target.files[0];
	
	if (!file) {
		return;
	}
	
	var reader = new FileReader();
	reader.onload = function(e) {
		OBJFILECONTENTS = e.target.result;
		parse_obj_file();
		populateCameraMenu();
	}; 
	
	reader.readAsText(file);
}

function readFile(e) {
	var file = e.target.files[0];
	
	if (!file) {
		showDialog("No file identified.");
		return;
	}
	
	var reader = new FileReader();
	
	reader.onload = function(e) {
		FILECONTENTS = e.target.result;
		parseFileContents(file.name);
	};
	
	reader.readAsText(file);
}

async function loadAppFile() {
	var filename = document.getElementById("app-file-select").value;
	if (!filename)
		return;
	
	try {
		var response = await fetch("./" + encodeURIComponent(filename));
		if (!response.ok)
			throw new Error("HTTP " + response.status);
		
		var contents = await response.text();
		if (filename.toLowerCase().endsWith(".obj")) {
			OBJFILECONTENTS = contents;
			parse_obj_file();
			populateCameraMenu();
		}
		else if (filename.toLowerCase().endsWith(".ppm")) {
			FILECONTENTS = contents;
			parseFileContents(filename);
		}
		else
			throw new Error("Unsupported app file type.");
	}
	catch (error) {
		showDialog("Could not load " + filename + ": " + error.message);
	}
}

var I = {};
function parseFileContents(fn) {
	try {
		if(!parsePPM(FILECONTENTS, fn)) 
			throw new Error("parseFileContents() FAILED!");
	} catch(e) {
		showDialog("Could not load " + fn + ". Check that it is a valid P3 PPM file.");
	}
}

function parsePPM(contents, fn) {
	var arr = contents.split("\n");
	
	if(arr[0]!="P3") {
		return false;
	}

	var line = arr[1];
	var vals = line.split(" ");
	var width = Number(vals[0]);
	var height = Number(vals[1]);
	
	var bit_depth = Number(arr[2]);
	
	var pix = [];
	for (var i = 3; i < arr.length; i = i + 3) {
		var r = Number(arr[i]);
		var g = Number(arr[i+1]);
		var b = Number(arr[i+2]);
		
		pix[i-3] = r, pix[i-2] = g, pix[i-1] = b;
	}
	
	var c = { data: pix, width: width, height: height };
	Data.PPM[fn] = c;

	showDialog("Image processed successfully.");
	
	return true;
}

function ppmObj(fn) {
	return { data: Data.PPM[fn].data, width: Data.PPM[fn].width, height: Data.PPM[fn].height };
}
