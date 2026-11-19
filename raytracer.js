var CANVAS_WIDTH = 500, CANVAS_HEIGHT = 281.25;
var WIDTH = CANVAS_WIDTH;
var HEIGHT = Math.round(CANVAS_HEIGHT);
var BGCOLOR = "#2222cc";
var RENDER_BG_COLOR = convHexClr("d6b96f") //colour(0,0,0)

/** GLOBAL OBJECTS */

var Data = {

				PPM: [],
				f: [],
				v: [],
				vn: [],
				vt: [],
				g: [], // not currently used
				o: {},
				cache: {},
				c: new camera(WIDTH, HEIGHT, (Math.PI/4)),
				l: new point_light(point(-20, 20, 40), colour(1,1,1)),
				
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

var selectedLightColour;

function applySelectedLightColour() {

	if (selectedLightColour && Data.l)
		Data.l.intensity = selectedLightColour;
}

function selectLightColour(r, g, b) {

	selectedLightColour = colour(r, g, b);
	applySelectedLightColour();
	
	if (typeof lightsModal !== "undefined")
		lightsModal.style.display = "none";
	
	if (Data.o && Data.o.s && Data.o.s.length && typeof renderImage === "function")
		renderImage();
}

Data.presets.camera.push(view_transform(point(0,0,20),point(0,0,0),vector(0,1,0)))
Data.presets.camera.push(view_transform(point(0,5,8),point(0,1,0),vector(0,1,0)))
Data.presets.camera.push(view_transform(point(25,0, 25), // from
								point(0,10,0),   // to
								vector(0,1,0)))

/** END GLOBAL OBJECTS */


function optionSelected()	{

	var ct;
	switch(document.getElementById("os").selectedIndex)	{
		
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
			WIDTH = 900
			HEIGHT = 550
			ct = Data.c.transform;
			Data.c = new camera(WIDTH, HEIGHT, (Math.PI/4));
			Data.c.setCTransform(ct);
			break;
			
		default:
	}
}

function camPresetSelected()	{
	
	var v = document.getElementById("campresets")
	
	Data.c.setCTransform(Data.presets.camera[v.selectedIndex])
	populateCameraMenu();
	console.log("Set Camera to preset " + (v.selectedIndex+1) + ".")
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

function doDivide()	{
	
	try	{
		
		Data.o.divide(DataR.divideValue)
		return true
	} catch(e)	{
		
		return false
	}
}

/** INIT */

let c = document.getElementById("canvas");
let ctx = c.getContext("2d");
let loop;

function init()	{

	Data.c.setCTransform(Data.presets.camera[0]);
	
	ctx.fillStyle = BGCOLOR
	ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT)
}

/** END OF INIT */


/** RAYTRACER CODE */

function scene()	{
	
	let o = group()
	for (let i = 0; i < arguments.length; i++)
		o.addChild(arguments[i])
	
	return Data.o = o;
}

var g_c, g_w, g_r, g_x, g_y

function render(c, w, remaining)	{

	//clearTimeout(loop)
	g_c = c
	g_w = w
	g_r = remaining
	g_x = 0
	g_y = 0
	console.time("render")
	render2();
}


function render2()	{

	g_x =0;
	while(g_x != WIDTH) {
	
		let r = g_c.ray_for_pixel(g_x, g_y);
				
		let c = color_at(g_w, r, g_r)
		
		if ((c.x==0)&&(c.y==0)&&(c.z==0))
			c = RENDER_BG_COLOR
		
		c = convert(c)
		ctx.fillStyle = "#" + c.x + c.y + c.z
		
		var x = g_x + ((CANVAS_WIDTH/2) - WIDTH/2)
		var y = g_y + ((CANVAS_HEIGHT/2) - HEIGHT/2)
		
		ctx.fillRect(x,y,1,1)
				
		g_x++;
	}

	g_x = 0
	g_y++
			
	if (g_y === HEIGHT)	{
				
		clearTimeout(to)
		console.log("COMPLETED RENDER.")
		console.timeEnd("render")
		return
	}
	
	to = setTimeout(render2, 0)	
}
/*
function render2()	{

	var r = g_c.ray_for_pixel(g_x, g_y);
			
	var c = color_at(g_w, r, g_r)
	
	if ((c.x==0)&&(c.y==0)&&(c.z==0))
		c = RENDER_BG_COLOR
	
	c = convert(c)
	ctx.fillStyle = "#" + c.x + c.y + c.z
	
	var x = g_x + ((CANVAS_WIDTH/2) - WIDTH/2)
	var y = g_y + ((CANVAS_HEIGHT/2) - HEIGHT/2)
	
	ctx.fillRect(x,y,1,1)
			
	g_x++;
	if (g_x === WIDTH)	{
				
		g_x = 0
		g_y++
	}
			
	if (g_y === HEIGHT)	{
				
		clearTimeout(to)
		console.log("COMPLETED RENDER.")
		console.timeEnd("render")
		return
	}
	
	to = setTimeout(render2, 0)	
}
*/

function convert(c)	{
	
	var red = c.x;
	var green = c.y;
	var blue = c.z;
	
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
	
	red = Math.floor(255*red); //if (red<10) red = "0" + red;
	green = Math.floor(255*green); //if (green<10) green = "0" + red;
	blue = Math.floor(255*blue); //if (blue<10) blue = "0" + red;
	
	red = rgbToHex(red);
	blue = rgbToHex(blue);
	green = rgbToHex(green);
	
	return { x: red, y: green, z: blue }
	/*
	var res = "#" + red + blue + green;
	return res;
	*/
}

function rgbToHex(rgb) { 

  var hex = rgb.toString(16)
  if (hex.length < 2)
       hex = "0" + hex;

  return hex
}

function write_pixel(x, y, color)	{
	
	// ctx.fill
	ctx.fillStyle = color
	ctx.fillRect( x, y, 1, 1 )
}

/*
function render(c, w, remaining)	{
	
	console.time("render")	
	
	for (var y = 0; y < HEIGHT; y++)	{
		
		//console.log("Line " + y + " of " + HEIGHT);
		
		for (var x = 0; x < WIDTH; x++)	{
	
			var r = c.ray_for_pixel(x, y);
			
			ctx.fillStyle = convert(color_at(w, r, remaining))
			ctx.fillRect(x,y,1,1)
		}
	}
	
	console.log("COMPLETED.\n")
	console.timeEnd("render")
}
*/

/** END OF RAYTRACER CODE */

/* FILE */

function ppmObj(fn)	{
	
	return { data: Data.PPM[fn].data, width: Data.PPM[fn].width, height: Data.PPM[fn].height }
}

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
    //displayContents(OBJFILECONTENTS);
	parse_obj_file()
  }; 
  
  reader.readAsText(file);
}

function readFile(e)	{
	
	//var file = e.target.files[0]
	var file = e.target.files[0];
	
	if (!file)	{
	
		showDialog("No file identified.");
		return
	}
	
	var reader = new FileReader()
	
	reader.onload = function(e)	{
		
		
		FILECONTENTS = e.target.result
		parseFileContents(file.name)
	}
	
	reader.readAsText(file)
}

function loadAppFile() {

	var filename = document.getElementById("app-file-select").value;
	if (!filename)
		return;
	
	fetch("./" + encodeURIComponent(filename))
		.then(function (response) {

			if (!response.ok)
				throw new Error("HTTP " + response.status);
			
			return response.text();
		})
		.then(function (contents) {

			if (filename.toLowerCase().endsWith(".obj")) {
			
				OBJFILECONTENTS = contents;
				parse_obj_file();
			}
			else if (filename.toLowerCase().endsWith(".ppm")) {
			
				FILECONTENTS = contents;
				parseFileContents(filename);
			}
			else
				throw new Error("Unsupported app file type.");
		})
		.catch(function (error) {

			showDialog("Could not load " + filename + ": " + error.message);
		});
}

var I = {}
function parseFileContents(fn)	{
	
	try	{
	
		// if file ext == ".rdt" then
		//eval("I = " + FILECONTENTS + ";")
		// else if file ext == ".ppm"
		
		if(!parsePPM(FILECONTENTS, fn)) 
			throw new Error("parseFileContents() FAILED!")
	} catch(e)	{
	
		showDialog("Could not load " + fn + ". Check that it is a valid P3 PPM file.");
	}
	
	// else
	
}

function parsePPM(contents, fn)	{

	// Data.PPM.push(new PPM{width, height, colour_depth, pixels[height*width], filename})
	
	var arr = contents.split("\n");
	
	if(arr[0]!="P3")	{
	
		return false;
	}

	var line = arr[1];
	var vals = line.split(" ")
	var width = Number(vals[0])
	var height = Number(vals[1])
	
	var bit_depth = Number(arr[2])
	
	/*
	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	var ctx = canvas.getContext('2d');
	var img = ctx.getImageData(0, 0, width, height);
	var pix = img.data;
	*/
	
	
	//var arr = []
	
	//var x = 0, y = 0
	
	var pix = []
	for (var i = 3; i < arr.length; i = i + 3)	{
		
		var r = Number(arr[i])
		var g = Number(arr[i+1])
		var b = Number(arr[i+2])
		
		//r = 255, g = 33, b = 33
		//pix[ppos]=r [ppos+1]=g [ppos+2]=b [ppos+3]=255
		pix[i-3] = r, pix[i-2] = g, pix[i-1] = b;

	}
	
	//ctx.putImageData(img, 0, 0)

	var c = { data: pix, width: width, height: height }
	Data.PPM[fn] = c;

	showDialog("Image processed successfully.");
	
	return true;
}
/* END OF FILE */

/* SPLASH SCREEN FUNCTIONS & VARIABLES */
 


/* END OF SPLASH SCREEN FUNCTIONS & VARIABLES */
