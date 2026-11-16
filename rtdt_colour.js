/* RtDt colour adapters. Native RGB shading; conversion only at I/O boundaries.
 * Standard functions use snake_case; constructors use PascalCase.
 * RGB/CMYK channels are normalized 0..1. Palette indices are integers.
 */
var rtdt_colour = (function () {
    var c64 = [
        [0,0,0],[255,255,255],[136,0,0],[170,255,238],
        [204,68,204],[0,204,85],[0,0,170],[238,238,119],
        [221,136,85],[102,68,0],[255,119,119],[51,51,51],
        [119,119,119],[170,255,102],[0,136,255],[187,187,187]
    ];
    var ansi16 = [
        [0,0,0],[128,0,0],[0,128,0],[128,128,0],
        [0,0,128],[128,0,128],[0,128,128],[192,192,192],
        [128,128,128],[255,0,0],[0,255,0],[255,255,0],
        [0,0,255],[255,0,255],[0,255,255],[255,255,255]
    ];
    function clamp(n) { n = Number(n); return isFinite(n) ? Math.min(1,Math.max(0,n)) : 0; }
    function byte(n) { return Math.round(clamp(n)*255); }
    function rgb(r,g,b) { return {r:clamp(r),g:clamp(g),b:clamp(b)}; }
    function rgba(r,g,b,a) { return {r:clamp(r),g:clamp(g),b:clamp(b),a:clamp(a)}; }
    function from_cmyk(c,m,y,k) {
        k=clamp(k); return rgb((1-clamp(c))*(1-k),(1-clamp(m))*(1-k),(1-clamp(y))*(1-k));
    }
    function to_cmyk(color) {
        var k=1-Math.max(color.r,color.g,color.b);
        if(k>=1) return {c:0,m:0,y:0,k:1};
        return {c:(1-color.r-k)/(1-k),m:(1-color.g-k)/(1-k),y:(1-color.b-k)/(1-k),k:k};
    }
    function from_hex(value) {
        var h=String(value).replace(/^#/,'');
        if(/^[0-9a-f]{3}$/i.test(h)) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        if(!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) throw new Error('Expected #RGB, #RRGGBB or #RRGGBBAA');
        return rgba(parseInt(h.substr(0,2),16)/255,parseInt(h.substr(2,2),16)/255,
            parseInt(h.substr(4,2),16)/255,h.length===8?parseInt(h.substr(6,2),16)/255:1);
    }
    function to_hex(c,alpha) {
        function h(v) { var x=byte(v).toString(16); return x.length===1?'0'+x:x; }
        return '#'+h(c.r)+h(c.g)+h(c.b)+(alpha?h(c.a===undefined?1:c.a):'');
    }
    function palette(name) {
        var p=[],i,v,r,g,b;
        if(name==='c64') return c64;
        if(name==='gray8') {
            for(i=0;i<256;i++) p.push([i,i,i]);
            return p;
        }
        if(name==='ansi16') return ansi16;
        if(name!=='ansi256') throw new Error('Unknown indexed palette: '+name);
        for(i=0;i<16;i++) p.push(ansi16[i]);
        for(r=0;r<6;r++) for(g=0;g<6;g++) for(b=0;b<6;b++)
            p.push([r===0?0:55+40*r,g===0?0:55+40*g,b===0?0:55+40*b]);
        for(i=0;i<24;i++) { v=8+i*10; p.push([v,v,v]); }
        return p;
    }
    function from_index(name,index) {
        var p=palette(name), i=Number(index);
        if(i!==Math.floor(i)||i<0||i>=p.length) throw new Error('Invalid '+name+' index: '+index);
        return rgb(p[i][0]/255,p[i][1]/255,p[i][2]/255);
    }
    function to_index(name,c) {
        var p=palette(name),r=byte(c.r),g=byte(c.g),b=byte(c.b);
        var best=0,dist=Infinity,i,dr,dg,db,d;
        if(name==='gray8') return Math.round(0.2126*r+0.7152*g+0.0722*b);
        for(i=0;i<p.length;i++) {
            dr=p[i][0]-r; dg=p[i][1]-g; db=p[i][2]-b;
            d=dr*dr+dg*dg+db*db;
            if(d<dist) { dist=d; best=i; }
        }
        return best;
    }
    function from_input(format,value) {
        var f=String(format).toLowerCase();
        if(f==='rgb') return rgb(value.r,value.g,value.b);
        if(f==='rgba') return rgba(value.r,value.g,value.b,value.a);
        if(f==='cmyk') return from_cmyk(value.c,value.m,value.y,value.k);
        if(f==='html'||f==='hex') return from_hex(value);
        if(f==='gray8'||f==='ansi256'||f==='ansi16'||f==='c64') return from_index(f,value);
        throw new Error('Unsupported input format: '+format);
    }
    function to_output(format,color) {
        var f=String(format).toLowerCase();
        if(f==='rgb') return rgb(color.r,color.g,color.b);
        if(f==='rgba') return rgba(color.r,color.g,color.b,color.a===undefined?1:color.a);
        if(f==='cmyk') return to_cmyk(color);
        if(f==='html'||f==='hex') return to_hex(color,false);
        if(f==='gray8'||f==='ansi256'||f==='ansi16'||f==='c64') return to_index(f,color);
        throw new Error('Unsupported output format: '+format);
    }
    /* Actual indexed BMP: BITMAPINFOHEADER + palette + 4/8-bit pixel indices. */
    function indexed_bmp(pixels,width,height,format) {
        var p=palette(format),bits=p.length<=16?4:8;
        if(width<1||height<1||pixels.length!==width*height) throw new Error('Indexed BMP pixel count mismatch');
        var rowSize=Math.floor((width*bits+31)/32)*4;
        var offset=54+p.length*4, size=offset+rowSize*height;
        var data=new Uint8Array(size), view=new DataView(data.buffer),i,y,x,row,idx;
        data[0]=66;data[1]=77;
        view.setUint32(2,size,true);view.setUint32(10,offset,true);
        view.setUint32(14,40,true);view.setInt32(18,width,true);view.setInt32(22,height,true);
        view.setUint16(26,1,true);view.setUint16(28,bits,true);
        view.setUint32(34,rowSize*height,true);view.setUint32(46,p.length,true);
        for(i=0;i<p.length;i++) {
            data[54+i*4]=p[i][2];data[55+i*4]=p[i][1];data[56+i*4]=p[i][0];
        }
        for(y=0;y<height;y++) {
            row=offset+(height-1-y)*rowSize;
            for(x=0;x<width;x++) {
                idx=to_index(format,pixels[y*width+x]);
                if(bits===8) data[row+x]=idx;
                else if((x&1)===0) data[row+(x>>1)]=idx<<4;
                else data[row+(x>>1)]|=idx;
            }
        }
        return data;
    }
    return {rgb:rgb,rgba:rgba,from_cmyk:from_cmyk,to_cmyk:to_cmyk,
        from_hex:from_hex,to_hex:to_hex,palette:palette,from_index:from_index,
        to_index:to_index,from_input:from_input,to_output:to_output,
        indexed_bmp:indexed_bmp,clamp:clamp,byte:byte};
}());
