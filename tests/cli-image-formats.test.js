'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),entry=path.join(root,'cli.js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rtdt-cli-'));
function run(args,expected=0) {
 const proc=cp.spawnSync(process.execPath,[entry,'--scene','scene1','--width','8','--height','8'].concat(args),{cwd:temp,encoding:'utf8',timeout:30000});
 assert.equal(proc.status,expected,'CLI command failed: '+proc.stderr+'\n'+proc.stdout);
 return proc;
}
try {
 run(['--output','a.png']);const png=fs.readFileSync(path.join(temp,'a.png'));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),8);assert.equal(png.readUInt32BE(20),8);
 const idat=png.indexOf(Buffer.from('IDAT'));assert.ok(idat>0);
 assert.equal(zlib.inflateSync(png.subarray(idat+4,idat+4+png.readUInt32BE(idat-4))).length,8*(8*4+1));
 run(['--output','a.jpg','--jpeg-quality','93']);const jpeg=fs.readFileSync(path.join(temp,'a.jpg'));
 assert.equal(jpeg.subarray(0,2).toString('hex'),'ffd8');
 assert.equal(jpeg.subarray(-2).toString('hex'),'ffd9');
 const decoded=require('jpeg-js').decode(jpeg);assert.equal(decoded.width,8);assert.equal(decoded.height,8);
 run(['--output','a.bmp']);const bmp=fs.readFileSync(path.join(temp,'a.bmp'));assert.equal(bmp.subarray(0,2).toString(),'BM');assert.equal(bmp.readUInt16LE(28),24);
 for(const [pal,bits] of [['ansi256',8],['c64',4],['ansi16',4],['html',8]]) {
    run(['--output',pal+'.bmp','--bmp-palette',pal]);
    const b=fs.readFileSync(path.join(temp,pal+'.bmp'));
    assert.equal(b.readUInt16LE(28),bits,pal+' bit depth');
    assert.equal(b.readUInt32LE(10),54+b.readUInt32LE(46)*4,pal+' palette offset');
    if(pal==='html')assert.equal(b.readUInt32LE(46),139,'HTML BMP must contain 139 unique colours');
 }
 run(['--output','a.ppm']);assert.match(fs.readFileSync(path.join(temp,'a.ppm'),'utf8'),/^P3\s+8 8\s+255/);
 run(['--format','jpeg','--output-dir','images']);assert.equal(fs.readFileSync(path.join(temp,'images','render.jpg')).subarray(0,2).toString('hex'),'ffd8');
 run(['--output','invalid.png','--format','bmp'],1);
 assert.equal(fs.existsSync(path.join(temp,'invalid.png')),false);
 run(['--output','invalid.gif'],1);
 run(['--width','9junk','--output','invalid.png'],1);
 run(['--output','invalid.png','--bmp-palette','ansi16'],1);
 assert.match(cp.spawnSync(process.execPath,[entry,'--help'],{encoding:'utf8'}).stdout,/PNG, JPEG, BMP/);
 console.log('CLI image format render and file-signature checks passed');
} finally {fs.rmSync(temp,{force:true,recursive:true});}
