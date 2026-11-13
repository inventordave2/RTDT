// raytracer-core.js
// Shared rendering logic - works in Node.js and Browser
// NO DOM calls, NO Canvas context, NO Browser APIs

var CANVAS_WIDTH = 500, CANVAS_HEIGHT = 281.25;
var WIDTH = CANVAS_WIDTH;
var HEIGHT = Math.round(CANVAS_HEIGHT);
var RENDER_BG_COLOR = colour(0.84, 0.73, 0.44); // d6b96f

/** GLOBAL STATE - Used by both browser and CLI */
var Data = {
    PPM: [],
    f: [],
    v: [],
    vn: [],
    vt: [],
    g: [],
    o: {},
    cache: {},
    c: null,  // Will be initialized later
    l: null,  // Will be initialized later
    presets: { camera: [], lights: [], scenes: [] }
};

var DataR = {
    x_min: Infinity,
    x_max: -Infinity,
    y_min: Infinity,
    y_max: -Infinity,
    z_min: Infinity,
    z_max: -Infinity,
    f_begins: 0,
    v_begins: 0,
    vn_begins: 0,
    vt_begins: 0,
    divideValue: 100
};

/** Initialization function - Call this to set up the raytracer */
function initRaytracer(width, height) {
    WIDTH = width || CANVAS_WIDTH;
    HEIGHT = height || Math.round(CANVAS_HEIGHT);
    
    Data.c = new camera(WIDTH, HEIGHT, (Math.PI/4));
    Data.l = new point_light(point(-20, 20, 40), colour(1,1,1));
    
    // Initialize camera presets
    Data.presets.camera = [];
    Data.presets.camera.push(view_transform(point(0,0,20), point(0,0,0), vector(0,1,0)));
    Data.presets.camera.push(view_transform(point(0,5,8), point(0,1,0), vector(0,1,0)));
    Data.presets.camera.push(view_transform(point(25,0,25), point(0,10,0), vector(0,1,0)));
}

/** PURE RENDERING LOGIC */

function generateBVH() {
    // BVH generation logic - no canvas calls
    if (!Data.o || !Data.o.divide_bvh)
        return;
    
    console.log("Generating BVH...");
    
    Data.o.divide_bvh(DataR.divideValue);
    
    console.log("BVH generation complete");
}

var g_pixels = [];  // Pixel buffer
var g_x = 0, g_y = 0;  // Current rendering position
var g_c = null, g_w = null, g_r = null;  // Rendering state

function renderSceneToPixels(world, camera, renderQuality) {
    console.log("Starting render...");
    console.time("render");
    
    g_c = camera;
    g_w = world;
    g_r = renderQuality || 1;
    g_x = 0;
    g_y = 0;
    g_pixels = [];
    
    return new Promise(function(resolve) {
        render2Async(function() {
            console.timeEnd("render");
            console.log("Render complete");
            resolve(g_pixels);
        });
    });
}

var to = null;
function render2Async(onComplete) {
    // Non-blocking render loop
    
    g_x = 0;
    while(g_x !== WIDTH) {
        var r = g_c.ray_for_pixel(g_x, g_y);
        var c = color_at(g_w, r, g_r);
        
        if ((c.x === 0) && (c.y === 0) && (c.z === 0))
            c = RENDER_BG_COLOR;
        
        // Clamp color values
        c.x = Math.min(1, Math.max(0, c.x));
        c.y = Math.min(1, Math.max(0, c.y));
        c.z = Math.min(1, Math.max(0, c.z));
        
        g_pixels.push(c);
        
        g_x++;
    }
    
    g_x = 0;
    g_y++;
    
    if (g_y === HEIGHT) {
        // Render complete
        onComplete();
        return;
    }
    
    // Continue rendering in next iteration
    to = setTimeout(function() {
        render2Async(onComplete);
    }, 0);
}

// Synchronous render (for Node.js CLI, no UI blocking needed)
function renderSceneSync(world, camera, renderQuality) {
    console.log("Rendering " + WIDTH + "x" + HEIGHT + "...");
    console.time("render");
    
    var pixels = [];
    
    for (var y = 0; y < HEIGHT; y++) {
        if (y % 10 === 0) {
            console.log("Rendering line " + y + "/" + HEIGHT + "...");
        }
        
        for (var x = 0; x < WIDTH; x++) {
            var r = camera.ray_for_pixel(x, y);
            var c = color_at(world, r, renderQuality || 1);
            
            if ((c.x === 0) && (c.y === 0) && (c.z === 0))
                c = RENDER_BG_COLOR;
            
            // Clamp color values
            c.x = Math.min(1, Math.max(0, c.x));
            c.y = Math.min(1, Math.max(0, c.y));
            c.z = Math.min(1, Math.max(0, c.z));
            
            pixels.push(c);
        }
    }
    
    console.timeEnd("render");
    console.log("Render complete");
    
    return pixels;
}

/** Helper: Clamp color to 0-255 range */
function colorTo255(c) {
    return {
        r: Math.floor(Math.max(0, Math.min(1, c.x)) * 255),
        g: Math.floor(Math.max(0, Math.min(1, c.y)) * 255),
        b: Math.floor(Math.max(0, Math.min(1, c.z)) * 255)
    };
}

/** Get a scene by name - called from both browser and CLI */
function getScene(sceneName) {
    // This gets populated from rt.examples.js
    if (typeof scenes !== 'undefined' && scenes[sceneName]) {
        return scenes[sceneName];
    }
    
    throw new Error("Scene not found: " + sceneName);
}

/** Utility: Reset rendering state */
function resetRenderingState() {
    g_x = 0;
    g_y = 0;
    g_pixels = [];
    Data.PPM = [];
    
    if (to) {
        clearTimeout(to);
        to = null;
    }
}
