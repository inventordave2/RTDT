'use strict';
/* Run: node tests/scene-expressions.test.js */
const assert = require('assert');
const scene = require('../rtdt_scene_loader');

function rejectsExpression(source) {
    assert.throws(function () { scene.evaluateExpression(source, {i:2}); });
}

assert.strictEqual(scene.evaluateExpression('2 + 3 * 4'),14);
assert.strictEqual(scene.evaluateExpression('2^3^2'),512);
assert.strictEqual(scene.evaluateExpression('-2^2'),-4);
assert.strictEqual(scene.evaluateExpression('pow(2,3)+max(2,3)+floor(1.8)'),12);
assert.strictEqual(scene.evaluateExpression('(i+1)%2',{i:2}),1);
assert.strictEqual(scene.evaluateExpression('Math.E'),Math.E);
assert.ok(Math.abs(scene.evaluateExpression('sin(pi/2)+Math.cos(Math.PI)'))<1e-12);
assert.strictEqual(scene.evaluateExpression('1e-5*2'),0.00002);
assert.deepStrictEqual(scene.evaluateExpressions({
    position:'[0, i*2, pow(i,2)]',
    scaling:['2-i*0.3',1,'2-i*0.3']
},{i:3}).position,[0,6,9]);
assert.strictEqual(scene.evaluateExpressions({
    name:'spiral',material:'ruby',description:'i like ray tracing'
},{i:2}).name,'spiral');
assert.strictEqual(scene.evaluateExpressions({
    transform:'rotation_y(i*2*pi/20) @ translation(5,0,0)'
},{i:2}).transform,'rotation_y(i*2*pi/20) @ translation(5,0,0)');
assert.deepStrictEqual(scene.evaluateExpressions({
    position:'max(1,i),2,3'
},{i:4}).position,[4,2,3]);
[
    '1/0', 'sqrt(-1)', 'global.process', 'process.exit(0)',
    '1;process.exit(0)', "Math['sin'](1)",
    "constructor.constructor('return process')()",
    'foo', 'Math.constructor', '2+3;7'
].forEach(rejectsExpression);
assert.throws(function () {
    scene.evaluateExpressions({position:'i*unknown'},{i:2});
});
assert.throws(function () {
    scene.evaluateExpression('i',{i:'2'});
});
console.log('Scene expression security and arithmetic regression tests passed');
