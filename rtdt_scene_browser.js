/* RtDt browser scene v1: deliberately small, declarative JSON scene format.
 * No executable expressions, eval, YAML or remote script loading.
 */
var rtdt_scene_browser = (function () {
    function triple(value, label, fallback) {
        if (value === undefined) value = fallback;
        if (!Array.isArray(value) || value.length !== 3 ||
            !value.every(function (n) { return typeof n === 'number' && isFinite(n); }))
            throw new Error('Invalid scene ' + label + ' (expected three finite numbers)');
        return value;
    }
    function point3(a) { return point(a[0],a[1],a[2]); }
    function vector3(a) { return vector(a[0],a[1],a[2]); }
    function parse(source) {
        var model = typeof source === 'string' ? JSON.parse(source) : source;
        if (!model || Array.isArray(model) || model.version !== 1 ||
            !Array.isArray(model.objects) || model.objects.length > 500)
            throw new Error('Expected browser .scene JSON version 1 with up to 500 objects');
        // Empty scenes are valid and render only the configured background.
        triple(model.background,'background',[0,0,0]);
        model.objects.forEach(function (item) {
            if (!item || ['sphere','cube','plane','mesh'].indexOf(item.type) < 0)
                throw new Error('Unsupported browser scene primitive');
            if (item.type === 'mesh' && typeof item.mesh !== 'string')
                throw new Error('Mesh scene object requires a mesh asset path');
            if (item.texture && ['sphere','plane','mesh'].indexOf(item.type) < 0)
                throw new Error('Texture mapping is supported on spheres, planes and UV-mapped meshes');
            triple(item.position,'position',[0,0,0]);
            triple(item.scale,'scale',[1,1,1]);
            triple(item.color,'color',[0.5,0.5,0.5]);
            if (item.scale && item.scale.some(function (v) { return v === 0; }))
                throw new Error('Scene object scale must be nonzero');
            if (item.material) {
                Object.keys(item.material).forEach(function (key) {
                    if (['ambient','diffuse','specular','shininess','reflective','transparency','refractive_index'].indexOf(key) < 0 ||
                        typeof item.material[key] !== 'number' || !isFinite(item.material[key]))
                        throw new Error('Invalid material property: '+key);
                });
            }
        });
        var cameraDef=model.camera || {}, lightDef=model.light || {};
        triple(cameraDef.from,'camera.from',[0,2,-10]);
        triple(cameraDef.to,'camera.to',[0,0,0]);
        triple(cameraDef.up,'camera.up',[0,1,0]);
        if (cameraDef.fov !== undefined && (typeof cameraDef.fov !== 'number' ||
            !isFinite(cameraDef.fov) || cameraDef.fov <= 0 || cameraDef.fov >= 180))
            throw new Error('Camera field of view must be between 0 and 180 degrees');
        triple(lightDef.position,'light.position',[-10,10,-10]);
        triple(lightDef.intensity,'light.intensity',[1,1,1]);
        return model;
    }
    function load(source, width, height, resolved) {
        var model=parse(source);
        resolved=resolved || {files:{},entries:[]};
        if (!Number.isInteger(width) || !Number.isInteger(height) ||
            width < 1 || height < 1 || width * height > 4000000)
            throw new Error('Invalid scene render resolution');
        initRaytracer(width,height);
        var c=model.camera || {}, l=model.light || {};
        var bg=triple(model.background,'background',[0,0,0]);
        RtDtState.scene.background=colour(bg[0],bg[1],bg[2]);
        RtDtState.scene.c.setCTransform(view_transform(
            point3(triple(c.from,'camera.from',[0,2,-10])),
            point3(triple(c.to,'camera.to',[0,0,0])),
            vector3(triple(c.up,'camera.up',[0,1,0]))));
        if (c.fov !== undefined) {
            RtDtState.scene.c=new camera(width,height,c.fov*Math.PI/180);
            RtDtState.scene.c.setCTransform(view_transform(
                point3(triple(c.from,'camera.from',[0,2,-10])),
                point3(triple(c.to,'camera.to',[0,0,0])),
                vector3(triple(c.up,'camera.up',[0,1,0]))));
        }
        RtDtState.scene.l=new point_light(
            point3(triple(l.position,'light.position',[-10,10,-10])),
            colour.apply(null,triple(l.intensity,'light.intensity',[1,1,1])));
        var root=group();
        model.objects.forEach(function (def,index) {
            var shape=def.type==='sphere'?sphere(def.name):
                (def.type==='cube'?cube(def.name):
                (def.type==='plane'?plane(def.name):
                    rtdt_scene_assets.build_mesh(resolved.files['obj:'+def.mesh] || [])));
            if (def.type === 'mesh' && !resolved.files['obj:'+def.mesh])
                throw new Error('Missing declared mesh '+def.mesh);
            var pos=triple(def.position,'position',[0,0,0]);
            var scale=triple(def.scale,'scale',[1,1,1]);
            shape.transform=m_multiply(translation(pos[0],pos[1],pos[2]),
                scaling(scale[0],scale[1],scale[2]));
            var rgb=triple(def.color,'color',[0.5,0.5,0.5]);
            shape.material.color=colour(rgb[0],rgb[1],rgb[2]);
            Object.keys(def.material || {}).forEach(function (key) {
                shape.material[key]=def.material[key];
            });
            if (def.type === 'mesh') {
                shape.s.forEach(function (face) {
                    face.material.color=colour(rgb[0],rgb[1],rgb[2]);
                    Object.keys(def.material || {}).forEach(function (key) {
                        face.material[key]=def.material[key];
                    });
                });
            }
            var texturePath=def.texture;
            (resolved.entries || []).forEach(function (entry) {
                if (entry.kind === 'image' && (entry.target === index || entry.target === def.name))
                    texturePath=entry.path;
            });
            if (texturePath) {
                var image=resolved.files['image:'+texturePath];
                if (!image) throw new Error('Missing texture '+texturePath);
                if (def.type === 'mesh') {
                    // All triangle faces have independent per-corner OBJ vt coordinates.
                    // Assign albedo before subdividing the mesh into BVH groups.
                    shape.s.forEach(function (face) {
                        if (!face.uvs)
                            throw new Error('Textured mesh requires OBJ vt coordinates: '+def.mesh);
                        face.material.uv_image=image;
                    });
                } else {
                    shape.material.pattern=texture_pattern(texture_map(image_pattern(image),
                        def.type === 'sphere' ? spherical_map : planar_map));
                }
            }
            if (def.type === 'mesh' && shape.s.length > 128 &&
                typeof shape.divide === 'function')
                shape.divide(8);
            root.addChild(shape);
        });
        RtDtState.scene.o=root;
        return model;
    }
    return {parse:parse,load:load};
}());
