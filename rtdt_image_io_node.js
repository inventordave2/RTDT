'use strict';
/* RtDt Node output: PNG/JPEG/24-bit RGB BMP, legacy P3 PPM.
 * Does not silently write PPM bytes under another extension. */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const colour = require('./rtdt_colour');

function rgba(pixels, width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || height < 1 || width * height > 4000000 ||
        !pixels || pixels.length !== width * height)
        throw new Error('Invalid render dimensions or pixels');
    const data = Buffer.alloc(width * height * 4);
    for (let i = 0; i < pixels.length; i++) {
        const pixel = pixels[i];
        if (!pixel || ![pixel.r,pixel.g,pixel.b].every(Number.isFinite))
            throw new Error('Invalid RGB at pixel ' + i);
        data[4*i] = colour.byte(pixel.r);
        data[4*i+1] = colour.byte(pixel.g);
        data[4*i+2] = colour.byte(pixel.b);
        data[4*i+3] = 255;
    }
    return data;
}
let crcTable = null;
function crc32(buffer) {
    if (!crcTable) {
        crcTable = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++)
                c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
            crcTable[n] = c >>> 0;
        }
    }
    let crc = 0xffffffff;
    for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(name, data) {
    const kind = Buffer.from(name, 'ascii');
    const payload = Buffer.concat([kind, data]);
    const chunk = Buffer.alloc(data.length + 12);
    chunk.writeUInt32BE(data.length, 0);
    payload.copy(chunk, 4);
    chunk.writeUInt32BE(crc32(payload), 8 + data.length);
    return chunk;
}
function encodePNG(pixels, width, height) {
    const raw = rgba(pixels, width, height);
    const stride = width * 4;
    const scanlines = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bit depth
    header[9] = 6; // RGB with alpha
    return Buffer.concat([
        Buffer.from([137,80,78,71,13,10,26,10]),
        pngChunk('IHDR',header),
        pngChunk('IDAT',zlib.deflateSync(scanlines)),
        pngChunk('IEND',Buffer.alloc(0))
    ]);
}
function encodeJPEG(pixels,width,height,quality) {
    // Pure JavaScript encoder installed with npm install.
    const jpeg = require('jpeg-js');
    const q = quality === undefined ? 85 : Number(quality);
    if (!Number.isInteger(q) || q < 1 || q > 100)
        throw new Error('JPEG quality must be from 1 to 100');
    return jpeg.encode({data:rgba(pixels,width,height),width,height},q).data;
}
function encodeBMP(pixels,width,height) {
    return Buffer.from(colour.rgb_bmp(pixels,width,height));
}
function encodePPM(pixels,width,height) {
    const data = rgba(pixels,width,height);
    const lines = ['P3',width+' '+height,'255'];
    for (let y=0; y<height; y++) {
        const row = [];
        for (let x=0; x<width; x++) {
            const pos = 4 * (y*width+x);
            row.push(data[pos]+' '+data[pos+1]+' '+data[pos+2]);
        }
        lines.push(row.join('  '));
    }
    return Buffer.from(lines.join('\n')+'\n','ascii');
}
function encode(pixels,width,height,format) {
    switch (String(format).toLowerCase()) {
        case 'png': return encodePNG(pixels,width,height);
        case 'jpeg': case 'jpg': return encodeJPEG(pixels,width,height);
        case 'bmp': return encodeBMP(pixels,width,height);
        case 'ppm': return encodePPM(pixels,width,height);
        default: throw new Error('Unsupported image format: '+format+
            ' (choose PNG, JPEG, BMP or legacy PPM)');
    }
}
function inferFormat(filename) {
    const format = path.extname(filename).slice(1).toLowerCase();
    if (['png','jpg','jpeg','bmp','ppm'].indexOf(format)<0)
        throw new Error('Unsupported output extension: '+filename+
            ' (choose .png, .jpg, .jpeg, .bmp or .ppm)');
    return format;
}
function writeImage(filename,pixels,width,height) {
    const format=inferFormat(filename);
    const encoded=encode(pixels,width,height,format);
    fs.mkdirSync(path.dirname(path.resolve(filename)),{recursive:true});
    fs.writeFileSync(filename,encoded);
    return {filename,format,bytes:encoded.length};
}
module.exports = {rgba,encodePNG,encodeJPEG,encodeBMP,encodePPM,
    encode,inferFormat,writeImage};
