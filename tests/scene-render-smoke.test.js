'use strict';
// Regression for the Data -> RtDtState migration that previously broke scene loading.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = [
  'rtdt_math.js', 'rtdt_core.js', 'rtdt_matrix-transform.js',
  'rtdt_matrix.js', 'rtdt_ray.js', 'rtdt_light.js',
  'rtdt_material.js', 'rtdt_world.js', 'rtdt_shade.js',
  'rtdt_p+e.js', 'rtdt_pattern.js', 'rtdt_colour.js',
  'rtdt_examples.js', 'raytracer-core.js', 'rtdt_objfile.js',
  'rtdt_scene_assets.js', 'rtdt_scene_browser.js', 'rtdt_aetherore.js'
];
const sandbox = {
  console: { log() {}, time() {}, timeEnd() {} },
  // Use the VM's intrinsic Array: matrix literals need the same Array.prototype as .scaling().
  Math, Number, String, Object, JSON, Date, Error, TypeError,
  Infinity, isFinite, parseInt, parseFloat
};
sandbox.prepCanvas = function () {};
sandbox.renderImage = function () {};
vm.createContext(sandbox);
for (const name of modules) {
  const code = fs.readFileSync(path.join(root, name), 'utf8');
  vm.runInContext(code, sandbox, {filename: name});
}
function run(script) { return vm.runInContext(script, sandbox); }
function renderPixel() {
  const pixel = run(`(function () {
    var w = new world();
    w.light = RtDtState.scene.l;
    w.objects = RtDtState.scene.o.s;
    return color_at(w, RtDtState.scene.c.ray_for_pixel(8,8), 1);
  })()`);
  assert.ok(pixel && Number.isFinite(pixel.r) && Number.isFinite(pixel.g) &&
    Number.isFinite(pixel.b), 'Rendered pixel must be finite RGB');
}
run('initRaytracer(16,16); scene1();');
assert.equal(run('RtDtState.scene.o.s.length'), 2);
renderPixel();

const sample = fs.readFileSync(path.join(root, 'samples', 'orbit.scene'), 'utf8');
sandbox.sampleSceneJson = sample;
run('rtdt_scene_browser.load(sampleSceneJson,16,16);');
assert.equal(run('RtDtState.scene.o.s.length'), 3);
renderPixel();
assert.equal(run('rtdt_scene_assets.definitions(JSON.parse(sampleSceneJson)).length'), 1);
assert.equal(run('rtdt_scene_assets.definitions(JSON.parse(sampleSceneJson))[0].kind'), 'phy');

// Hosted samples have valid scene JSON and dropdown entries.
const galleryNames = ['orbit','rocket-to-rainbow-planet','prism-garden','cosmic-orbs','neon-city','reflection-studio','aurora-orrery','lee-perry-smith-head'];
for (const name of galleryNames) {
  const model = JSON.parse(fs.readFileSync(path.join(root, 'samples', name + '.scene'), 'utf8'));
  assert.equal(model.version, 1);
  assert.ok(Array.isArray(model.objects) && model.objects.length > 0);
  assert.ok(fs.readFileSync(path.join(root, 'webapp.html'), 'utf8').includes('data-scene-path="samples/' + name + '.scene"'));
}

// Hosted Rocket to Rainbow Planet must be selectable and resolve its own OBJ paths.
const rocketPath = 'samples/rocket-to-rainbow-planet.scene';
const rocketText = fs.readFileSync(path.join(root, rocketPath), 'utf8');
const rocketModel = JSON.parse(rocketText);
const rocketAssets = rocketModel.assets.mesh.map(asset => asset.path);
assert.equal(rocketAssets.length, 4);
for (const meshPath of rocketAssets) {
  assert.ok(fs.existsSync(path.join(root, 'samples', meshPath)), 'Missing rocket OBJ: ' + meshPath);
}
const browserUI = fs.readFileSync(path.join(root, 'rtdt_ui_browser_20261118.js'), 'utf8');
const browserHTML = fs.readFileSync(path.join(root, 'webapp.html'), 'utf8');
assert.ok(browserUI.includes("option.getAttribute('data-scene-path')"));
assert.ok(browserUI.includes("fetch(scenePath,{cache:'no-store'})"));
assert.match(browserHTML, /<option value="rocket" data-scene-path="samples\/rocket-to-rainbow-planet\.scene">Rocket to Rainbow Planet/);
assert.match(browserHTML, /<option value="scene" data-scene-path="samples\/orbit\.scene">Orbit Studio/);
assert.match(browserHTML, /<option value="repo" selected>RtDt repository/);
assert.match(browserHTML, /<option value="aurora-orrery" data-scene-path="samples\/aurora-orrery\.scene">/);
const aurora = JSON.parse(fs.readFileSync(path.join(root,'samples','aurora-orrery.scene'),'utf8'));
assert.equal(aurora.objects.length, 67);
assert.equal(aurora.assets.mesh.length,4);
for (const asset of aurora.assets.mesh) {
  const meshText = fs.readFileSync(path.join(root,'samples',asset.path),'utf8');
  assert.match(meshText,/^v /m);
  assert.match(meshText,/^f /m);
}
assert.ok(aurora.assets.mesh.some(asset => fs.readFileSync(path.join(root,'samples',asset.path),'utf8').includes('vn ')));

assert.match(browserHTML, /<script src="rtdt_ui_browser_20261118\.js\?v=[^"]+"><\/script>/);
for (const oldFile of ['raytracer.html','raytracer.js','raytracer-ui.js']) {
  assert.equal(fs.existsSync(path.join(root,oldFile)),false,
    'Retired legacy entrypoint must stay removed: '+oldFile);
}

run("RtDtState.meshImport.objFileContents = '# OBJ test';");
assert.equal(run('RtDtState.meshImport.objFileContents'), '# OBJ test');
assert.equal(run('typeof Data'), 'undefined');
assert.equal(run('typeof DataR'), 'undefined');


function rgb(value) { return [value.r,value.g,value.b]; }
// A ray miss uses its world background, and black surfaces stay black.
run("initRaytracer(9,9);");
run("var emptyWorld = new world(); emptyWorld.background = colour(0.2,0.3,0.4);");
assert.deepEqual(rgb(run("color_at(emptyWorld, RtDtState.scene.c.ray_for_pixel(4,4), 2)")), [0.2,0.3,0.4]);
const emptyJson = JSON.stringify({version:1,name:'Empty',objects:[],background:[0.12,0.22,0.32]});
sandbox.emptySceneJson = emptyJson;
run("rtdt_scene_browser.load(emptySceneJson,9,9);");
assert.equal(run("RtDtState.scene.o.s.length"),0);
assert.deepEqual(rgb(run("RtDtState.scene.background")), [0.12,0.22,0.32]);
run("var emptySceneWorld=new world(); emptySceneWorld.background=RtDtState.scene.background;");
assert.deepEqual(rgb(run("color_at(emptySceneWorld,RtDtState.scene.c.ray_for_pixel(4,4),2)")), [0.12,0.22,0.32]);
const blackJson = JSON.stringify({version:1,name:'Black',background:[0.7,0.5,0.1],
  camera:{from:[0,0,-5],to:[0,0,0],up:[0,1,0],fov:60},
  light:{position:[-10,10,-10],intensity:[1,1,1]},
  objects:[{type:'sphere',color:[0,0,0],material:{ambient:1,diffuse:0,specular:0,reflective:0}}]});
sandbox.blackSceneJson=blackJson;
run("rtdt_scene_browser.load(blackSceneJson,9,9);");
run("var blackWorld=new world(); blackWorld.light=RtDtState.scene.l; blackWorld.objects=RtDtState.scene.o.s; blackWorld.background=RtDtState.scene.background;");
assert.deepEqual(rgb(run("color_at(blackWorld,RtDtState.scene.c.ray_for_pixel(4,4),2)")), [0,0,0]);
assert.deepEqual(rgb(run("color_at(blackWorld,RtDtState.scene.c.ray_for_pixel(0,0),2)")), [0.7,0.5,0.1]);


// Triangle determinant tolerance must scale with tiny real-world scan geometry.
run("var tinyTriangle=triangle(point(0,0,0),point(0.001,0,0),point(0,0.001,0));");
run("var tinyRay=new ray(point(0.0002,0.0002,-1),vector(0,0,1));");
assert.equal(run("intersect(tinyTriangle,tinyRay).length"),1,
  'A valid hit on a millimetre-scale triangle must not be rejected as parallel');
run("var parallelRay=new ray(point(0.0002,0.0002,-1),vector(1,0,0));");
assert.equal(run("intersect(tinyTriangle,parallelRay).length"),0,
  'Truly parallel rays must still miss tiny triangles');

// BVH must actually subdivide a mesh and preserve the same intersections.
const tinyQuad = ['v 0 0 0','v 0.001 0 0','v 0.001 0.001 0',
  'v 0 0.001 0','f 1 2 3 4'].join('\n');
sandbox.tinyQuadText=tinyQuad;
run("var tinyMesh=rtdt_scene_assets.build_mesh(rtdt_scene_assets.parse_obj(tinyQuadText));");
run("tinyMesh.transform=scaling(8,8,8);");
run("var tinyMeshRay=new ray(point(0.003,0.004,-1),vector(0,0,1));");
const priorHits=run("intersect(tinyMesh,tinyMeshRay).length");
assert.ok(priorHits>0,'Scaled tiny mesh should be hit before BVH subdivision');
run("tinyMesh.divide(2);");
assert.equal(run("tinyMesh.s.length"),2,'BVH should create two child groups');
assert.equal(run("tinyMesh.s.every(x=>x.type==='group')"),true);
assert.equal(run("intersect(tinyMesh,tinyMeshRay).length"),priorHits,
  'BVH subdivision must preserve hits on tiny triangles');

console.log('RtDt built-in and JSON scene construction + ray rendering passed');
