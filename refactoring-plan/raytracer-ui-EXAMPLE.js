// raytracer-ui.js
// BROWSER-ONLY UI code
// This file is loaded ONLY in browsers, never in Node.js

// Check we're in a browser
if (typeof window === 'undefined') {
    throw new Error("raytracer-ui.js should only be loaded in browsers!");
}

var ctx;  // Canvas context
var canvas;
var loop;
var selectedLightColour;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    initRaytracer(WIDTH, HEIGHT);
    
    // Set up event listeners
    setupEventListeners();
    
    console.log("UI initialized");
});

function setupEventListeners() {
    var renderBtn = document.getElementById('render-btn');
    if (renderBtn) {
        renderBtn.addEventListener('click', renderImage);
    }
    
    var generateBVHBtn = document.getElementById('generate-bvh-btn');
    if (generateBVHBtn) {
        generateBVHBtn.addEventListener('click', generateBVH);
    }
    
    var osSelect = document.getElementById('os');
    if (osSelect) {
        osSelect.addEventListener('change', optionSelected);
    }
    
    var camPresetsSelect = document.getElementById('campresets');
    if (camPresetsSelect) {
        camPresetsSelect.addEventListener('change', camPresetSelected);
    }
}

function optionSelected() {
    var ct;
    switch(document.getElementById("os").selectedIndex) {
        case 0:
            WIDTH = 150;
            HEIGHT = Math.round(150 * (9/16));
            ct = Data.c.transform;
            Data.c = new camera(WIDTH, HEIGHT, (Math.PI/4));
            Data.c.setCTransform(ct);
            break;
        
        case 1:
            WIDTH = 500;
            HEIGHT = Math.round(500 * (9/16));
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
    }
    
    populateCameraMenu();
}

function camPresetSelected() {
    var v = document.getElementById("campresets");
    Data.c.setCTransform(Data.presets.camera[v.selectedIndex]);
    populateCameraMenu();
    console.log("Set Camera to preset " + (v.selectedIndex + 1) + ".");
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
        info = "Scene bounds: [" +
            formatCameraValue(bounds.min.x) + ", " + formatCameraValue(bounds.max.x) + "] x " +
            formatCameraValue(bounds.min.y) + ", " + formatCameraValue(bounds.max.y) + "] x " +
            formatCameraValue(bounds.min.z) + ", " + formatCameraValue(bounds.max.z) + "]";
    }
    
    setCameraVectorFields("cam-to", center);
    
    var upVector = multiply_matrix_by_tuple(inverse(Data.c.transform), vector(0, 1, 0));
    setCameraVectorFields("cam-up", upVector);
    
    var sceneInfo = document.getElementById('scene-info');
    if (sceneInfo) {
        sceneInfo.textContent = info;
    }
}

function selectLightColour(r, g, b) {
    selectedLightColour = colour(r, g, b);
    applySelectedLightColour();
    
    if (typeof lightsModal !== "undefined")
        lightsModal.style.display = "none";
    
    if (Data.o && Data.o.s && Data.o.s.length && typeof renderImage === "function")
        renderImage();
}

function applySelectedLightColour() {
    if (selectedLightColour && Data.l)
        Data.l.intensity = selectedLightColour;
}

function renderImage() {
    console.log("Starting render to canvas...");
    
    if (!Data.c || !Data.l || !Data.o) {
        console.error("Scene not initialized");
        return;
    }
    
    var world = new world();
    world.light = Data.l;
    world.objects = Data.o.s || [Data.o];
    
    // Clear canvas
    ctx.fillStyle = "#" + RENDER_BG_COLOR.x.toString(16) + 
                         RENDER_BG_COLOR.y.toString(16) + 
                         RENDER_BG_COLOR.z.toString(16);
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Start async rendering
    renderSceneToPixels(world, Data.c, 1).then(function(pixels) {
        displayPixelsOnCanvas(pixels);
    });
}

function displayPixelsOnCanvas(pixels) {
    var pixelIndex = 0;
    
    for (var y = 0; y < HEIGHT; y++) {
        for (var x = 0; x < WIDTH; x++) {
            var c = pixels[pixelIndex++];
            var rgb = colorTo255(c);
            
            ctx.fillStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
            
            var canvasX = x + ((CANVAS_WIDTH/2) - WIDTH/2);
            var canvasY = y + ((CANVAS_HEIGHT/2) - HEIGHT/2);
            
            ctx.fillRect(canvasX, canvasY, 1, 1);
        }
    }
    
    console.log("Render displayed on canvas");
}

function handleFileSelected(event) {
    var file = event.target.files[0];
    if (!file)
        return;
    
    console.log("Loading file: " + file.name);
    
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;
        loadOBJFromString(contents);
        populateCameraMenu();
        console.log("OBJ file loaded");
    };
    reader.readAsText(file);
}

function loadOBJFromString(objString) {
    // Parse OBJ data
    Data.v = [];
    Data.vn = [];
    Data.f = [];
    
    var lines = objString.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        
        if (line.startsWith('v ')) {
            var parts = line.split(/\s+/).slice(1);
            var v = vector(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
            Data.v.push(v);
        }
        else if (line.startsWith('vn ')) {
            var parts = line.split(/\s+/).slice(1);
            var vn = vector(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
            Data.vn.push(vn);
        }
        else if (line.startsWith('f ')) {
            // Face data - store for triangle creation
            Data.f.push(line);
        }
    }
    
    console.log("Loaded " + Data.v.length + " vertices, " + Data.f.length + " faces");
}
