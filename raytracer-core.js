// raytracer-core.js
// Shared rendering logic - works in Node.js and Browser
// NO DOM calls, NO Canvas context, NO Browser APIs

var CANVAS_WIDTH = 500, CANVAS_HEIGHT = 281.25;
var WIDTH = CANVAS_WIDTH;
var HEIGHT = Math.round(CANVAS_HEIGHT);
var BGCOLOR = "#2222cc";
// Ray misses are handled by color_at(), not by replacing black pixels.

/** RtDt runtime state.
 * All mutable data belongs to one named owner; call resetScene() between jobs.
 * Scene geometry, import bookkeeping and render controls are distinct.
 */
function createRtDtSceneState() {
    return {
        PPM: Object.create(null), f: [], v: [], vn: [], vt: [], g: [],
        o: {}, cache: {}, c: null, l: null, background: colour(0,0,0),
        presets: {camera: [], lights: [], scenes: []}
    };
}
var RtDtState = {
    scene: createRtDtSceneState(),
    meshImport: {
        x_min: Infinity, x_max: -Infinity, y_min: Infinity, y_max: -Infinity,
        z_min: Infinity, z_max: -Infinity,
        objFileContents: '', f_begins: 0, v_begins: 0, vn_begins: 0, vt_begins: 0
    },
    renderOptions: {bvhThreshold: 100},
    resetScene: function () {
        this.scene = createRtDtSceneState();
        this.meshImport = {
            x_min: Infinity, x_max: -Infinity, y_min: Infinity, y_max: -Infinity,
            z_min: Infinity, z_max: -Infinity,
            f_begins: 0, v_begins: 0, vn_begins: 0, vt_begins: 0
        };
        this.renderOptions.bvhThreshold = 100;
        return this.scene;
    }
};

var selectedLightColour;

function applySelectedLightColour() {
	if (selectedLightColour && RtDtState.scene.l)
		RtDtState.scene.l.intensity = selectedLightColour;
}

function selectLightColour(r, g, b) {
	selectedLightColour = colour(r, g, b);
	applySelectedLightColour();
	
	if (typeof renderImage === "function")
		renderImage();
}

/** Initialization function - Call this to set up the raytracer */
function initRaytracer(width, height) {
	WIDTH = width || CANVAS_WIDTH;
	HEIGHT = height || Math.round(CANVAS_HEIGHT);
	
	RtDtState.scene.background = colour(0,0,0);
	RtDtState.scene.c = new camera(WIDTH, HEIGHT, (Math.PI/4));
	RtDtState.scene.l = new point_light(point(-20, 20, 40), colour(1,1,1));
	
	// Initialize camera presets
	RtDtState.scene.presets.camera = [];
	RtDtState.scene.presets.camera.push(view_transform(point(0,0,20), point(0,0,0), vector(0,1,0)));
	RtDtState.scene.presets.camera.push(view_transform(point(0,5,8), point(0,1,0), vector(0,1,0)));
	RtDtState.scene.presets.camera.push(view_transform(point(25,0, 25), point(0,10,0), vector(0,1,0)));
}

/** PURE RENDERING LOGIC */

function scene() {
	let o = group();
	for (let i = 0; i < arguments.length; i++)
		o.addChild(arguments[i]);
	
	return RtDtState.scene.o = o;
}

function doDivide() {
	try {
		RtDtState.scene.o.divide(RtDtState.renderOptions.bvhThreshold);
		return true;
	} catch(e) {
		return false;
	}
}

var g_c, g_w, g_r, g_x, g_y;
var g_pixels = [];

function render(c, w, remaining) {
	g_c = c;
	g_w = w;
	g_r = remaining;
	g_x = 0;
	g_y = 0;
	console.time("render");
	render2();
}

function render2() {
	g_x = 0;
	while(g_x != WIDTH) {
		let r = g_c.ray_for_pixel(g_x, g_y);
		let c = color_at(g_w, r, g_r);
		
		// Store pixel for later display or export
		g_pixels.push(c);
		
		g_x++;
	}

	g_x = 0;
	g_y++;
			
	if (g_y === HEIGHT) {
		clearTimeout(to);
		console.log("COMPLETED RENDER.");
		console.timeEnd("render");
		return;
	}
	
	to = setTimeout(render2, 0);
}

// Synchronous render (for Node.js CLI, no UI blocking needed)
function renderSceneSync(world, camera, renderQuality) {
	console.log("Rendering " + WIDTH + "x" + HEIGHT + "...");
	console.time("render");
	
	var pixels = [];
	
	for (var y = 0; y < HEIGHT; y++) {
		if (y % 10 === 0 && typeof console !== 'undefined') {
			console.log("Rendering line " + y + "/" + HEIGHT + "...");
		}
		
		for (var x = 0; x < WIDTH; x++) {
			var r = camera.ray_for_pixel(x, y);
			var c = color_at(world, r, renderQuality || 1);
			
			pixels.push(c);
		}
	}
	
	console.timeEnd("render");
	console.log("Render complete");
	
	return pixels;
}

/** Helper: Convert color to 0-255 range */
function convert(c) {
	var red = c.r;
	var green = c.g;
	var blue = c.b;
	
	if (red>1)
		red = 1;
	
	if (green>1)
		green = 1;
	
	if (blue>1)
		blue = 1;
	
	if (red<0)
		red = 0;
	
	if (green<0)
		green = 0;
	
	if (blue<0)
		blue = 0;
	
	red = Math.floor(255*red);
	green = Math.floor(255*green);
	blue = Math.floor(255*blue);
	
	red = rgbToHex(red);
	blue = rgbToHex(blue);
	green = rgbToHex(green);
	
	return { x: red, y: green, z: blue };
}

function rgbToHex(rgb) { 
	var hex = rgb.toString(16);
	if (hex.length < 2)
		hex = "0" + hex;
	return hex;
}

/** Helper: Get pixel data for export (e.g., PPM) */
function colorTo255(c) {
	return {
		r: Math.floor(Math.max(0, Math.min(1, c.r)) * 255),
		g: Math.floor(Math.max(0, Math.min(1, c.g)) * 255),
		b: Math.floor(Math.max(0, Math.min(1, c.b)) * 255)
	};
}

/** Utility: Reset rendering state */
function resetRenderingState() {
	g_x = 0;
	g_y = 0;
	g_pixels = [];
	RtDtState.scene.PPM = Object.create(null);
	
	if (typeof to !== 'undefined' && to) {
		clearTimeout(to);
		to = null;
	}
}
