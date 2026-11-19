'use strict';
// Keep every hosted JSON .scene pack self-contained or explicitly shared.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sampleRoot = path.join(root, 'samples');
const scenes = fs.readdirSync(sampleRoot).filter(name => name.endsWith('.scene'));
assert.ok(scenes.length >= 9, 'Expected all featured scenes including the head scan');
const html = fs.readFileSync(path.join(root,'webapp.html'),'utf8');
const expected = ['orbit','rocket-to-rainbow-planet','prism-garden',
  'cosmic-orbs','neon-city','reflection-studio','aurora-orrery','lee-perry-smith-head','vw-beetle-psychedelia'];
for (const name of expected) assert.ok(scenes.includes(name+'.scene'), 'Missing '+name+'.scene');

for (const name of scenes) {
  const sceneName = name.slice(0, -6);
  const scene = JSON.parse(fs.readFileSync(path.join(sampleRoot,name),'utf8'));
  assert.equal(scene.version, 1, 'Invalid scene version: '+name);
  assert.ok(Array.isArray(scene.objects), 'Missing objects: '+name);
  assert.ok(html.includes('data-scene-path="samples/'+name+'"'), 'Scene not listed: '+name);
  const refs = [];
  for (const kind of ['mesh','texture','animation']) {
    const entries = scene.assets && scene.assets[kind];
    for (const item of (Array.isArray(entries) ? entries : (entries ? [entries] : [])))
      refs.push(typeof item === 'string' ? item : item.path);
  }
  for (const obj of scene.objects) for (const key of ['mesh','texture'])
    if (obj[key]) refs.push(obj[key]);
  for (const ref of refs) {
    assert.equal(typeof ref,'string');
    assert.match(ref, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+$/, 'Expected subfolder path: '+ref);
    assert.ok(ref.startsWith(sceneName+'/') || ref.startsWith('shared/'),
      'Scene asset must belong to its scene folder or shared/: '+name+' -> '+ref);
    assert.ok(!ref.split('/').includes('..'), 'Asset must not traverse parents: '+ref);
    assert.ok(fs.statSync(path.join(sampleRoot,ref)).isFile(),
      'Missing '+ref+' referenced by '+name);
  }
}

const sandbox = { Number, Math, String, Object, Promise, Error, FileReader:undefined, isFinite };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'rtdt_scene_assets.js'),'utf8'),sandbox);
function pathFor(ref, scene) { return sandbox.rtdt_scene_assets.repo_path(ref,scene); }
assert.equal(pathFor('orbit/orbit.phy','samples/orbit.scene'),'samples/orbit/orbit.phy');
assert.equal(pathFor('shared/reusable.obj','samples/orbit.scene'),'samples/shared/reusable.obj');
assert.equal(pathFor('aurora-orrery/faceted-crystal.obj','samples/aurora-orrery.scene'),
  'samples/aurora-orrery/faceted-crystal.obj');
assert.throws(() => pathFor('../private.obj','samples/orbit.scene'));
assert.throws(() => pathFor('https://example.org/bad.obj','samples/orbit.scene'));

// A quad has four UV corners and becomes two triangles with preserved UV seams.
const quad = ['v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0',
  'vt 0 0','vt 1 0','vt 1 1','vt 0 1',
  'f 1/1 2/2 3/3 4/4'].join('\n');
const faces = sandbox.rtdt_scene_assets.parse_obj(quad);
assert.equal(faces.length, 2);
assert.equal(JSON.stringify(faces[0].uvs),'[[0,0],[1,0],[1,1]]');
assert.equal(JSON.stringify(faces[1].uvs),'[[0,0],[1,1],[0,1]]');

// Head OBJ provides per-corner UVs and triangle geometry.
const head = fs.readFileSync(path.join(sampleRoot,'lee-perry-smith-head','lee-perry-smith-head.obj'),'utf8');
const scanFaces = sandbox.rtdt_scene_assets.parse_obj(head);
assert.equal(scanFaces.length,17684);
assert.ok(scanFaces.every(f=>Array.isArray(f.uvs)&&f.uvs.length===3));
assert.ok(scanFaces.every(f=>Array.isArray(f.normals)&&f.normals.length===3));

// RGB image sampling is bilinear at the centre of a 2 x 2 texture.
sandbox.colour = (r,g,b)=>({r,g,b});
vm.runInContext(fs.readFileSync(path.join(root,'rtdt_pattern.js'),'utf8'),sandbox);
const pixel = sandbox.mesh_uv_color({width:2,height:2,data:new Uint8Array([
  255,0,0, 0,255,0,
  0,0,255, 255,255,255
])},0.5,0.5);
assert.ok(Math.abs(pixel.r-0.5)<1e-12 && Math.abs(pixel.g-0.5)<1e-12 &&
  Math.abs(pixel.b-0.5)<1e-12, 'Bilinear UV sampling must blend all four texels');

console.log('Scene folders, hosted asset references, OBJ UVs and texture sampling passed');
