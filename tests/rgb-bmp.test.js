'use strict';
/* Run: node tests/rgb-bmp.test.js
 * Test true-colour BMP bytes independently of browser downloads.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const colourSource = fs.readFileSync(path.join(__dirname, '..', 'rtdt_colour.js'), 'utf8');
const colour = vm.runInNewContext(colourSource + '\n rtdt_colour;');
const pixels = [
    {r: 1, g: 0, b: 0}, {r: 0, g: 1, b: 0}, // top: red, green
    {r: 0, g: 0, b: 1}, {r: 1, g: 1, b: 1}  // bottom: blue, white
];
const bmp = colour.rgb_bmp(pixels, 2, 2);
const header = new DataView(bmp.buffer);
assert.strictEqual(String.fromCharCode(bmp[0], bmp[1]), 'BM');
assert.strictEqual(header.getUint32(2, true), 70);
assert.strictEqual(header.getUint32(10, true), 54);
assert.strictEqual(header.getUint32(14, true), 40);
assert.strictEqual(header.getInt32(18, true), 2);
assert.strictEqual(header.getInt32(22, true), 2);
assert.strictEqual(header.getUint16(26, true), 1);
assert.strictEqual(header.getUint16(28, true), 24);
assert.strictEqual(header.getUint32(30, true), 0);
assert.strictEqual(header.getUint32(34, true), 16);
assert.deepStrictEqual(Array.from(bmp.slice(54)), [
    255, 0, 0, 255, 255, 255, 0, 0, // bottom, BGR, two pad bytes
    0, 0, 255, 0, 255, 0, 0, 0      // top, BGR, two pad bytes
]);
assert.deepStrictEqual(Array.from(colour.rgb_bmp([{r:0.2,g:0.4,b:0.6}],1,1).slice(54)),
    [153,102,51,0]);
assert.throws(function () { colour.rgb_bmp([], 2, 2); }, /RGB BMP/);
assert.throws(function () { colour.rgb_bmp(pixels, 0, 2); }, /RGB BMP/);
assert.throws(function () { colour.rgb_bmp(pixels, 1000000, 1000000); }, /RGB BMP/);

// Verify the browser export adapter offers a genuine BMP blob and filename.
const ioSource = fs.readFileSync(path.join(__dirname, '..', 'rtdt_image_io_browser.js'), 'utf8');
let clicked = false, downloadName = null, downloadedBlob = null;
const browser = {
    rtdt_colour: colour,
    Blob: function (parts, opts) { this.parts = parts; this.type = opts.type; },
    URL: {
        createObjectURL: function (blob) { downloadedBlob = blob; return 'blob:test'; },
        revokeObjectURL: function () {}
    },
    document: {
        createElement: function () {
            return {click: function () { clicked = true; }, set download(name) { downloadName = name; }};
        },
        body: {appendChild: function () {}, removeChild: function () {}}
    },
    setTimeout: function (fn) { fn(); }
};
vm.runInNewContext(ioSource, browser);
browser.rtdt_image_io_browser.export_rgb_bmp(pixels,2,2);
assert.ok(clicked, 'download anchor was not clicked');
assert.strictEqual(downloadName, 'render.bmp');
assert.strictEqual(downloadedBlob.type, 'image/bmp');
assert.deepStrictEqual(Array.from(downloadedBlob.parts[0]), Array.from(bmp));

console.log('RGB BMP 24-bit encoder and browser export tests passed');
