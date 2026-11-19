/* RtDt scene asset resolver (browser): declared paths, no executable code.
 * Repository paths stay same-origin; local files require explicit user selection.
 */
var rtdt_scene_assets = (function () {
    function check_path(path) {
        if (typeof path !== 'string' || path.length > 240 ||
            !/^[A-Za-z0-9_./-]+$/.test(path) || path.charAt(0) === '/' ||
            path.split('/').some(function (p) { return p === '..'; }))
            throw new Error('Unsafe or invalid scene asset path: ' + String(path));
        return path.replace(/^\.\//,'');
    }
    function definitions(model) {
        var out=[], declared=model.assets || {};
        [['mesh','obj'],['texture','image'],['animation','phy']].forEach(function (pair) {
            var entries=declared[pair[0]];
            if (!Array.isArray(entries)) entries=entries ? [entries] : [];
            entries.forEach(function (v) {
                var item=typeof v === 'string' ? {path:v} : v;
                if (!item || typeof item.path !== 'string') throw new Error('Asset must have a path');
                var entry={path:check_path(item.path),kind:pair[1],required:item.required !== false,
                    target:item.target};
                if (entry.target !== undefined && typeof entry.target !== 'string' &&
                    (!Number.isInteger(entry.target) || entry.target < 0))
                    throw new Error('Invalid asset target: ' + entry.path);
                out.push(entry);
            });
        });
        (model.objects || []).forEach(function (obj,index) {
            [['mesh','obj'],['texture','image']].forEach(function (pair) {
                if (obj && obj[pair[0]] !== undefined) {
                    var path=check_path(obj[pair[0]]);
                    if (!out.some(function (a) {return a.path===path && a.kind===pair[1] && (a.target===undefined || a.target===index || a.target===obj.name); }))
                        out.push({path:path,kind:pair[1],required:true,target:index});
                }
            });
        });
        return out;
    }
    function repo_path(assetPath,scenePath) {
        // Asset URLs are relative to the containing .scene file, not the site root.
        // e.g. samples/orbit.scene + orbit/orbit.phy -> samples/orbit/orbit.phy.
        // Scene-local or shared/ asset directories are recommended.
        var path=check_path(assetPath);
        var scene=check_path(scenePath);
        var directory=scene.lastIndexOf('/') < 0 ? '' : scene.slice(0,scene.lastIndexOf('/')+1);
        // Legacy explicitly repository-root paths are still accepted for older files.
        if (path.indexOf('samples/') === 0) return path;
        return directory+path;
    }
    function read_text(file) {
        return new Promise(function(resolve,reject) {
            var reader=new FileReader();
            reader.onload=function() { resolve(reader.result); };
            reader.onerror=function() { reject(new Error('Could not read '+file.name)); };
            reader.readAsText(file);
        });
    }
    function decode_image(file) {
        return new Promise(function(resolve,reject) {
            rtdt_image_io_browser.decode_file(file,function(error,image) {
                if (error) reject(error); else resolve(image);
            });
        });
    }
    function acquire(asset,scenePath,localFiles) {
        var path=check_path(asset.path), ext=asset.kind==='image';
        if (localFiles !== null) {
            var file=null, matches=[];
            for (var i=0;i<localFiles.length;i++) {
                var candidate=localFiles[i];
                if (candidate.webkitRelativePath===path || candidate.name===path ||
                    candidate.name===path.split('/').pop()) matches.push(candidate);
            }
            if (matches.length !== 1)
                return Promise.reject(new Error(matches.length ? 'Ambiguous local asset: '+path :
                    'Select required local file: '+path));
            file=matches[0];
            return ext ? decode_image(file) : read_text(file);
        }
        var location=repo_path(path,scenePath);
        return fetch(location,{cache:'no-cache'}).then(function(response) {
            if (!response.ok) throw new Error('HTTP '+response.status+' for '+location);
            return ext ? response.blob() : response.text();
        }).then(function(payload) {
            if (!ext) return payload;
            return decode_image(new File([payload],path.split('/').pop(),
                {type:payload.type || (/\.(jpe?g)$/i.test(path)?'image/jpeg':'application/octet-stream')}));
        });
    }
    function parse_obj(text) {
        if (typeof text !== 'string' || text.length>15000000)
            throw new Error('Invalid or oversized OBJ mesh');
        var vertices=[], normals=[], texcoords=[], faces=[], lines=text.split(/\r?\n/);
        if (lines.length>500000) throw new Error('OBJ too many lines');
        function index(spec,length,kind) {
            if (!/^-?\d+$/.test(spec)) throw new Error('Invalid OBJ '+kind+' index: '+spec);
            var number=Number(spec);
            if (!number) throw new Error('OBJ '+kind+' indices are one-based');
            var result=number>0 ? number-1 : length+number;
            if (result<0 || result>=length) throw new Error('OBJ '+kind+' index out of range');
            return result;
        }
        lines.forEach(function(line) {
            line=line.trim(); if (!line || line[0]==='#') return;
            var fields=line.split(/\s+/);
            if (fields[0]==='v' || fields[0]==='vn') {
                if (fields.length<4) throw new Error('OBJ '+fields[0]+' missing coordinates');
                var xyz=fields.slice(1,4).map(Number);
                if (xyz.some(function(n){return !isFinite(n)}))
                    throw new Error('Non-finite OBJ vertex or normal');
                (fields[0]==='v'?vertices:normals).push(xyz);
            }
            if (fields[0]==='vt') {
                if (fields.length<3) throw new Error('OBJ vt missing UV coordinates');
                var uv=fields.slice(1,3).map(Number);
                if (uv.some(function(n){return !isFinite(n)})) throw new Error('Invalid OBJ UV');
                texcoords.push(uv);
            }
            if (fields[0]==='f') {
                if (fields.length<4) throw new Error('OBJ face needs three vertices');
                var corners=fields.slice(1).map(function(part) {
                    var match=/^(-?\d+)(?:\/(-?\d*)?(?:\/(-?\d+))?)?$/.exec(part);
                    if (!match) throw new Error('Invalid OBJ face corner: '+part);
                    return {position:vertices[index(match[1],vertices.length,'vertex')],
                        normal:match[3] ? normals[index(match[3],normals.length,'normal')] : null,
                        uv:match[2] ? texcoords[index(match[2],texcoords.length,'UV')] : null};
                });
                for (var i=1;i<corners.length-1;i++) {
                    var tri=[corners[0],corners[i],corners[i+1]];
                    faces.push({vertices:tri.map(function(c){return c.position;}),
                        normals:tri.every(function(c){return !!c.normal;}) ?
                            tri.map(function(c){return c.normal;}) : null,
                        uvs:tri.every(function(c){return !!c.uv;}) ?
                            tri.map(function(c){return c.uv;}) : null});
                    if (faces.length>200000) throw new Error('OBJ too many triangles');
                }
            }
        });
        if (!faces.length) throw new Error('OBJ contains no triangle faces');
        return faces;
    }
    function build_mesh(faces) {
        var root=group();
        faces.forEach(function(face) {
            var p=face.vertices || face, n=face.normals;
            var faceShape=triangle(point.apply(null,p[0]),point.apply(null,p[1]),
                point.apply(null,p[2]),undefined,
                n ? vector.apply(null,n[0]):undefined,
                n ? vector.apply(null,n[1]):undefined,
                n ? vector.apply(null,n[2]):undefined);
            faceShape.uvs=face.uvs || null;
            root.addChild(faceShape);
        });
        return root;
    }
    function resolve(model,scenePath,localFiles) {
        var entries=definitions(model), available={}, details=[], files=localFiles === undefined ? null : localFiles;
        /* Asset paths can be repeated for multiple targets; fetch each unique file once. */
        var cache={};
        return Promise.all(entries.map(function(entry) {
            var key=entry.kind+':'+entry.path;
            if (!cache[key]) cache[key]=acquire(entry,scenePath,files).then(function(data) {
                return entry.kind==='obj' ? parse_obj(data) : data;
            });
            return cache[key].then(function(data) {
                available[key]=data;
                details.push({path:entry.path,kind:entry.kind,required:entry.required,status:'loaded',target:entry.target});
            },function(error) {
                details.push({path:entry.path,kind:entry.kind,required:entry.required,status:'missing',error:error.message,target:entry.target});
                if (entry.required) throw new Error('Required '+entry.kind+' asset '+entry.path+': '+error.message);
            });
        })).then(function() { return {files:available,records:details,entries:entries}; });
    }
    return {definitions:definitions,resolve:resolve,parse_obj:parse_obj,build_mesh:build_mesh,
        check_path:check_path,repo_path:repo_path,read_text:read_text};
}());
