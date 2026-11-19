/* RtDt WebApp controller. Local scripts loaded in dependency order by webapp.html.
 * No eval, external framework, inline JS event handlers or Node APIs.
 */
var rtdt_ui_browser = (function () {

    var pixels = null;
    var running = false;
    var cancelled = false;
    var scene_loaded = false;
    var images = {};
    var render_index = 0;
    var phy_model = null;
    var phy_animator = null;
    var selected_image_name = null;
    var repository_request = 0;
    var active_scene_assets = [];
    var scene_load_token = 0;
    var playback_active = false;
    var playback_frame = 0;
    var playback_total = 0;
    var playback_fps = 24;

    function viewport_meta(message) {
        var node = element('viewportMeta');
        if (node) node.textContent = message;
    }

    function workflow(step) {
        var parent = element('workflowSteps');
        if (!parent || !parent.children) return;
        for (var i = 0; i < parent.children.length; i++) {
            parent.children[i].className = i < step ? 'is-done' :
                (i === step ? 'is-active' : '');
        }
    }

    function render_progress(percent, visible) {
        var bar = element('renderProgress');
        if (!bar) return;
        bar.value = percent;
        bar.style.display = visible ? 'block' : 'none';
    }

    function set_resolution(width, height) {
        if (running) {
            status('renderStatus', 'Stop the current render before changing resolution.', 'error');
            return;
        }
        element('renderWidth').value = String(width);
        element('renderHeight').value = String(height);
        viewport_meta(width + ' × ' + height + (scene_loaded ? ' · ready' : ' · no scene loaded'));
    }

    function playback_status(message, mode) {
        status('phyPlaybackStatus', message, mode || 'info');
    }
    function stop_animation(completed) {
        var active=playback_active;
        playback_active=false;
        var play=element('btnPlayPhy'), stop=element('btnStopPhy');
        if (play) play.disabled=false;
        if (stop) stop.disabled=true;
        if (active && !completed && running) cancelled=true;
        if (active) playback_status(completed ?
            'Animation complete. Final frame remains in the viewport.' :
            'Animation playback stopped.',completed?'success':'info');
    }
    function render_animation_frame() {
        if (!playback_active) return;
        var t=playback_frame/playback_fps;
        try {
            element('phyTime').value=String(t);
            phy_animator.at(t);
            pixels=null;
            playback_status('Rendering frame '+(playback_frame+1)+' / '+
                (playback_total+1)+' at '+t.toFixed(3)+'s','info');
            start_render();
            if (!running) throw new Error('Frame render did not start');
        } catch (error) {
            stop_animation(false);
            playback_status('Playback failed: '+error.message,'error');
        }
    }
    function play_animation() {
        if (running || playback_active) {
            playback_status('Stop rendering before starting animation.','error');
            return;
        }
        if (!scene_loaded || !phy_model || !phy_animator) {
            playback_status('Load a scene with a .phy animation first.','error');
            return;
        }
        var end=Number(element('phyEndTime').value);
        playback_fps=(phy_model.timeline&&phy_model.timeline.fps)||24;
        if (!isFinite(end) || end<=0 || !isFinite(playback_fps) ||
            playback_fps<=0 || end*playback_fps>240) {
            playback_status('Playback must contain between 2 and 240 frames. Adjust the end time.','error');
            return;
        }
        playback_total=Math.round(end*playback_fps);
        playback_frame=0;
        playback_active=true;
        element('btnPlayPhy').disabled=true;
        element('btnStopPhy').disabled=false;
        render_animation_frame();
    }

    function step_phy_frame(direction) {
        if (!phy_model) {
            status('phyStatus', 'Load a .phy file before stepping frames.', 'error');
            return;
        }
        var fps = phy_model.timeline && phy_model.timeline.fps || 30;
        var current = Number(element('phyTime').value);
        if (!isFinite(current) || current < 0) current = 0;
        var frame = Math.max(0, Math.round(current * fps) + direction);
        element('phyTime').value = String(frame / fps);
        apply_phy();
    }

    function element(id) {

        return document.getElementById(id);
    }

    function status(id, message, mode) {

        var node = element(id);
        if (!node)
            return;

        node.textContent = message;
        node.className = 'status ' + (mode || 'info');
        node.style.display = 'block';
    }

    function open_dialog(id) {

        var node = element(id);
        if (node)
            node.className += ' show';
    }

    function close_dialog(id) {

        var node = element(id);
        if (node)
            node.className = node.className.replace(/\s*show\b/g, '');
    }


    function set_scene_source() {
        var source = element('sceneSource').value;
        element('sceneBuiltInGroup').style.display = source === 'built-in' ? 'block' : 'none';
        element('sceneRepoGroup').style.display = source === 'repo' ? 'block' : 'none';
        element('sceneLocalGroup').style.display = source === 'local' ? 'block' : 'none';
        element('btnLoadScene').textContent = source === 'local' ? 'Load my .scene file' :
            (source === 'repo' ? 'Load repository scene' : 'Load built-in scene');
        if (!scene_loaded)
            show_scene_assets([], 'Load a scene to inspect its mesh, texture and animation dependencies.');
    }

    function scene_assets(model) {
        return rtdt_scene_assets.definitions(model);
    }

    function show_scene_assets(assets, emptyMessage) {
        active_scene_assets = assets;
        var list = element('sceneDependencyList');
        while (list.firstChild) list.removeChild(list.firstChild);
        var note = element('sceneDependencyText');
        var missing = assets.filter(function(asset) {
            return asset.required && asset.status !== 'loaded';
        });
        note.textContent = assets.length ?
            (missing.length ? missing.length + ' required asset(s) unresolved. Rendering is blocked.' :
                assets.length + ' asset(s) resolved or optional.') :
            (emptyMessage || 'No external files required.');
        assets.forEach(function(asset) {
            var item=document.createElement('div');
            item.className='rtdt-dep-item';
            var title=document.createElement('b');
            title.textContent=(asset.status==='loaded'?'Loaded':asset.status==='missing'?'Missing':'Declared')+
                ' · '+(asset.required?'Required ':'Optional ')+
                (asset.kind==='obj'?'mesh':asset.kind==='image'?'texture':'animation');
            var name=document.createElement('small');
            name.textContent=asset.path+(asset.error?' · '+asset.error:'');
            item.appendChild(title); item.appendChild(name);
            if (asset.status!=='loaded') {
                var action=document.createElement('button');
                action.type='button'; action.textContent='Choose replacement…';
                action.addEventListener('click',function() {
                    open_import(asset.kind,element('assetDefaultSource').value);
                });
                item.appendChild(action);
            }
            list.appendChild(item);
        });
    }

    function reset_bvh_status() {
        var node=element('bvhStatus');
        if (node) {
            node.textContent='Not optimised for this scene.';
            node.className='rtdt-bvh-status';
        }
    }

    function count_bvh_groups(node, visited) {
        if (!node || typeof node!=='object') return 0;
        visited=visited || [];
        if (visited.indexOf(node)!==-1) return 0;
        visited.push(node);
        var children=Array.isArray(node.s)?node.s:[];
        return (node.type==='group'?1:0)+children.reduce(function(sum,child) {
            return sum+count_bvh_groups(child,visited);
        },0);
    }

    function load_selected_scene() {
        var source = element('sceneSource').value;
        if (source === 'built-in') { load_scene(); return Promise.resolve(scene_loaded); }
        if (running) {
            status('sceneStatus', 'Stop rendering before changing scene.', 'error');
            return Promise.resolve(false);
        }
        var promise;
        if (source === 'repo') {
            var sample=repository_samples[element('sceneRepoSelect').value];
            if (!sample || sample.kind!=='scene') {
                status('sceneStatus','Select a supported repository scene.','error');
                return Promise.resolve(false);
            }
            promise=fetch(sample.path,{cache:'no-cache'}).then(function(response) {
                if (!response.ok) throw new Error('Scene HTTP '+response.status);
                return response.text();
            }).then(function(text) { return use_scene_source(text,sample.path); });
        } else {
            var chosen=element('sceneLocalFile').files[0];
            if (!chosen) {
                status('sceneStatus','Choose a .scene file from your computer.','error');
                return Promise.resolve(false);
            }
            var localFiles=Array.prototype.slice.call(element('sceneLocalAssets').files||[]);
            promise=rtdt_scene_assets.read_text(chosen).then(function(text) {
                return use_scene_source(text,chosen.name,localFiles);
            });
        }
        return promise.then(function (ok) {
            status('sceneStatus', ok ? 'Scene loaded. Check the asset list below.' :
                'Scene not loaded. Choose a supported .scene file.',
                ok ? 'success' : 'error');
            return ok;
        }).catch(function (error) {
            status('sceneStatus', error.message, 'error');
            return false;
        });
    }

    function scene_factory(name) {

        var scenes = {
            scene1: scene1,
            scene2: scene2,
            scene3: scene3,
            cm_cube: cm_cube,
            mySkyBox: mySkyBox,
            earth: earth,
            endGame: endGame
        };
        return Object.prototype.hasOwnProperty.call(scenes, name) ? scenes[name] : null;
    }

    function load_scene() {

        if (running) {
            status('mainStatus', 'Stop rendering before loading another scene.', 'error');
            return;
        }
        try {

            var name = element('sceneSelect').value;
            var factory = scene_factory(name);
            if (!factory)
                throw new Error('Unknown scene: ' + name);

            initRaytracer(Number(element('renderWidth').value),
                Number(element('renderHeight').value));
            factory();

            if (!RtDtState.scene.o || !RtDtState.scene.o.s)
                throw new Error('Scene did not create a group of shapes.');

            scene_loaded = true;
            phy_model = null;
            phy_animator = null;
            ++scene_load_token;
            reset_bvh_status();
            var phyFileControl = element('phyFile');
            if (phyFileControl) phyFileControl.value = '';
            viewport_meta(WIDTH + ' × ' + HEIGHT + ' · ' + name);
            show_scene_assets(name === 'earth' ? [{kind:'image',path:'img/earthmap1k.jpg',required:false}] : [],
                'Built-in scene: no external OBJ mesh or texture required.');
            workflow(1);
            pixels = null;
            status('mainStatus', 'Scene loaded: ' + name + '. Ready to render.', 'success');
            refresh_objects();
        } catch (error) {

            status('mainStatus', error.message, 'error');
        }
    }

    function phy_bindings() {

        var bindings = {};
        var objects = RtDtState.scene.o && RtDtState.scene.o.s ? RtDtState.scene.o.s : [];
        for (var i = 0; i < objects.length; i++) {

            bindings[String(i)] = objects[i];
            var alias = objects[i].id2;
            if (alias && !Object.prototype.hasOwnProperty.call(bindings, String(alias)))
                bindings[String(alias)] = objects[i];
        }
        return bindings;
    }

    function apply_phy() {

        if (running) {

            status('phyStatus', 'Stop the current render before changing the pose.', 'error');
            return;
        }
        if (!scene_loaded || !phy_model) {

            status('phyStatus', 'Load a scene and a .phy file first.', 'error');
            return;
        }
        try {

            var t = Number(element('phyTime').value);
            if (!isFinite(t) || t < 0)
                throw new Error('Time must be a nonnegative number.');
            if (!phy_animator)
                phy_animator = rtdt_aetherore.create_animator(phy_model, phy_bindings());
            phy_animator.at(t);
            pixels = null;
            workflow(2);
            status('phyStatus', 'Applied .phy pose at t=' + t + 's. Render to view.', 'success');
        } catch (error) {

            status('phyStatus', error.message, 'error');
        }
    }

    function use_phy_source(source, filename) {
        if (!scene_loaded)
            throw new Error('Load a scene before its .phy animation.');
        if (running)
            throw new Error('Stop rendering before loading .phy.');
        var model = rtdt_aetherore.parse_phy(source);
        var animator = rtdt_aetherore.create_animator(model, phy_bindings());
        phy_model = model;
        phy_animator = animator;
        element('phyTime').value = '0';
        apply_phy();
        status('phyStatus', 'Loaded AetherOre ' + filename + ' at t=0.', 'success');
    }

    var repository_samples = {
        scene: {path:'samples/orbit.scene', kind:'scene'},
        rocket: {path:'samples/rocket-to-rainbow-planet.scene', kind:'scene'},
        phy: {path:'samples/orbit/orbit.phy', kind:'phy'},
        obj: {path:'obj/pyramid.obj', kind:'obj'},
        jpeg: {path:'img/earthmap1k.jpg', kind:'image'}
    };

    function open_import(kind, source) {
        element('importKind').value = kind || 'scene';
        element('importSource').value = source || 'repo';
        update_import_fields();
        status('repoSampleStatus', 'Choose a file to import.', 'info');
        open_dialog('importModal');
        element('importKind').focus();
    }

    function update_import_fields() {
        var kind = element('importKind').value;
        var local = element('importSource').value === 'local';
        element('importRepoGroup').style.display = local ? 'none' : 'block';
        element('importLocalGroup').style.display = local ? 'block' : 'none';
        var choices = {scene:'scene',phy:'phy',obj:'obj',image:'jpeg'};
        element('repoSampleSelect').value = choices[kind];
        var fileInput = element('importLocalFile');
        var accepts = {scene:'.scene,application/json',phy:'.phy',obj:'.obj',
            image:'.png,.jpg,.jpeg,.bmp,.ppm,image/png,image/jpeg,image/bmp'};
        fileInput.accept = accepts[kind];
        fileInput.value = '';
    }

    function use_scene_source(source, name, localFiles) {
        if (running || playback_active)
            return Promise.reject(new Error('Stop rendering before loading another scene.'));
        var model=rtdt_scene_browser.parse(source);
        var token=++scene_load_token;
        var entries=scene_assets(model);
        scene_loaded=false;
        pixels=null;
        show_scene_assets(entries);
        reset_bvh_status();
        status('sceneStatus','Resolving '+entries.length+' declared asset(s)…','info');
        return rtdt_scene_assets.resolve(model,name,localFiles).then(function(resolved) {
            if (token!==scene_load_token) return false;
            rtdt_scene_browser.load(model,Number(element('renderWidth').value),
                Number(element('renderHeight').value),resolved);
            scene_loaded=true; phy_model=null; phy_animator=null;
            resolved.entries.forEach(function(entry) {
                if (entry.kind==='image' && resolved.files['image:'+entry.path]) {
                    var decoded=resolved.files['image:'+entry.path];
                    images[entry.path]=decoded;
                    RtDtState.scene.PPM[entry.path]=decoded;
                }
            });
            var animation=resolved.entries.filter(function(entry) {
                return entry.kind==='phy' && resolved.files['phy:'+entry.path];
            })[0];
            if (animation) {
                use_phy_source(resolved.files['phy:'+animation.path],animation.path);
                var timeline=element('phyTime').closest && element('phyTime').closest('details');
                if (timeline) timeline.open=true;
            }
            show_scene_assets(resolved.records);
            workflow(1);
            viewport_meta(WIDTH+' × '+HEIGHT+' · '+(model.name||name));
            refresh_objects();
            status('mainStatus','Scene and assets loaded: '+(model.name||name),'success');
            status('sceneStatus','Scene ready ('+resolved.records.length+' asset(s) checked).','success');
            return true;
        }).catch(function(error) {
            if (token===scene_load_token) {
                scene_loaded=false;
                show_scene_assets(entries.map(function(entry) {
                    return {path:entry.path,kind:entry.kind,required:entry.required,
                        status:'missing',error:error.message};
                }));
                status('sceneStatus','Scene failed: '+error.message,'error');
            }
            throw error;
        });
    }

    function use_obj_source(source, name) {
        if (running) throw new Error('Stop rendering before loading an OBJ mesh.');
        RtDtState.meshImport.objFileContents = source;
        parse_obj_file();
        scene_loaded = true;
        phy_model = null;
        phy_animator = null;
        pixels = null;
        ++scene_load_token;
        reset_bvh_status();
        show_scene_assets([],'OBJ mesh imported as a scene. No declared external dependencies.');
        workflow(1);
        viewport_meta(WIDTH + ' × ' + HEIGHT + ' · ' + name);
        refresh_objects();
        status('mainStatus','OBJ mesh imported: ' + name, 'success');
    }

    function use_image_file(file) {
        return new Promise(function (resolve,reject) {
            rtdt_image_io_browser.decode_file(file,function (error,image) {
                if (error) { reject(error); return; }
                images[file.name] = image;
                selected_image_name = file.name;
                RtDtState.scene.PPM[file.name] = image;
                /* The Earth sample uses this backwards-compatible texture key. */
                if (/earth/i.test(file.name)) RtDtState.scene.PPM['earth.ppm'] = image;
                element('imageInfo').textContent = file.name + ': ' +
                    image.width + ' × ' + image.height + ' RGB';
                refresh_objects();
                status('mainStatus','Image imported: ' + file.name +
                    '. Select a shape in Material texture settings to apply it.', 'success');
                resolve(true);
            });
        });
    }

    function read_local_file(file,kind) {
        if (!file) return Promise.reject(new Error('Select a file from your computer.'));
        if (kind === 'image') return use_image_file(file);
        var extension = {scene:/\.scene$/i,phy:/\.phy$/i,obj:/\.obj$/i};
        if (!extension[kind] || !extension[kind].test(file.name))
            return Promise.reject(new Error('Expected a '+kind+' file.'));
        return new Promise(function (resolve,reject) {
            var reader=new FileReader();
            reader.onerror=function () { reject(new Error('Could not read '+file.name)); };
            reader.onload=function () {
                try {
                    if (kind === 'scene') {
                        use_scene_source(reader.result,file.name,[]).then(resolve,reject);
                    } else {
                        if (kind === 'phy') use_phy_source(reader.result,file.name);
                        else use_obj_source(reader.result,file.name);
                        resolve(true);
                    }
                } catch(error) { reject(error); }
            };
            reader.readAsText(file);
        });
    }

    function import_selected_file() {
        if (running) {
            status('repoSampleStatus','Stop rendering before importing.', 'error');
            return Promise.resolve(false);
        }
        var button=element('btnImportSelected');
        button.disabled=true;
        var promise;
        if (element('importSource').value === 'repo')
            promise=load_repository_sample();
        else
            promise=read_local_file(element('importLocalFile').files[0],
                element('importKind').value);
        return promise.then(function (ok) {
            if (ok) {
                status('repoSampleStatus','File imported successfully.','success');
                close_dialog('importModal');
                close_dialog('aboutModal');
            }
            return ok;
        }).catch(function (error) {
            status('repoSampleStatus',error.message,'error');
            return false;
        }).then(function (ok) {
            button.disabled=false;
            return ok;
        });
    }

    function load_repository_sample() {
        var id = element('repoSampleSelect').value;
        var sample = Object.prototype.hasOwnProperty.call(repository_samples,id) ?
            repository_samples[id] : null;
        if (!sample) {
            status('repoSampleStatus', 'Choose a repository sample.', 'error');
            return Promise.resolve(false);
        }
        if (running) {
            status('repoSampleStatus', 'Stop rendering before loading a sample.', 'error');
            return Promise.resolve(false);
        }
        var request = ++repository_request;
        var trigger = element('btnImportSelected');
        trigger.disabled = true;
        status('repoSampleStatus','Loading ' + sample.path + '…','info');
        return fetch(sample.path, {cache:'no-cache'}).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + sample.path);
            return sample.kind === 'image' ? response.blob() : response.text();
        }).then(function (payload) {
            if (request !== repository_request)
                return false;
            if (sample.kind === 'scene') {
                return use_scene_source(payload,sample.path);
            }
            else if (sample.kind === 'phy') {
                use_phy_source(payload,sample.path);
            }
            else if (sample.kind === 'obj') {
                use_obj_source(payload,sample.path);
            }
            else if (sample.kind === 'image') {
                return new Promise(function (resolve,reject) {
                    var file = new File([payload],sample.path.split('/').pop(),
                        {type:payload.type || 'image/jpeg'});
                    use_image_file(file).then(resolve,reject);
                });
            }
            return true;
        }).then(function (ok) {
            if (request !== repository_request) return false;
            status('repoSampleStatus', 'Loaded ' + sample.path +
                (sample.kind === 'image' ?
                    '. Select a sphere and Apply to Material, or load the Earth scene.' :
                    '. Ready to render.'), 'success');
            return ok;
        }).catch(function (error) {
            if (request === repository_request)
                status('repoSampleStatus', 'Could not load sample: ' + error.message,'error');
            return false;
        }).then(function (ok) {
            if (request === repository_request) trigger.disabled = false;
            return ok;
        });
    }

    function load_phy() {

        var file = element('phyFile').files[0];
        if (!file) {

            status('phyStatus', 'Select a .phy file.', 'error');
            return;
        }
        if (!/\.phy$/i.test(file.name)) {

            status('phyStatus', 'Expected a .phy file.', 'error');
            return;
        }
        var reader = new FileReader();
        reader.onload = function () {

            try {

                use_phy_source(reader.result,file.name);
            } catch (error) {

                status('phyStatus', error.message, 'error');
            }
        };
        reader.onerror = function () {

            status('phyStatus', 'Could not read .phy file.', 'error');
        };
        reader.readAsText(file);
    }

    function change_camera() {

        if (running) {
            status('mainStatus', 'Stop rendering before updating camera settings.', 'error');
            return;
        }
        if (!scene_loaded) {

            status('mainStatus', 'Load a scene first.', 'error');
            return;
        }

        try {

            var from = point(
                Number(element('camX').value),
                Number(element('camY').value),
                Number(element('camZ').value));
            var to = point(
                Number(element('lookX').value),
                Number(element('lookY').value),
                Number(element('lookZ').value));
            var fov = Number(element('cameraFov').value);
            if (!isFinite(fov) || fov <= 0 || fov >= 180 ||
                (from.x === to.x && from.y === to.y && from.z === to.z))
                throw new Error('Invalid camera position or field of view');

            var up = vector(0, 1, 0);
            var direction = normalize(subtract(to, from));
            if (Math.abs(direction.y) > 0.999)
                up = vector(0, 0, 1);

            RtDtState.scene.c = new camera(WIDTH, HEIGHT, fov * Math.PI / 180);
            RtDtState.scene.c.setCTransform(view_transform(from, to, up));
            status('mainStatus', 'Camera updated.', 'success');
            close_dialog('cameraModal');
        } catch (error) {

            status('mainStatus', error.message, 'error');
        }
    }

    function camera_preset() {

        var index = Number(element('cameraPreset').value);
        if (!scene_loaded || !RtDtState.scene.presets.camera[index])
            return;
        RtDtState.scene.c.setCTransform(RtDtState.scene.presets.camera[index]);
        status('mainStatus', 'Camera preset applied.', 'success');
    }

    function channel_byte(id) {
        var raw=String(element(id).value).trim(), value=Number(raw);
        if (!raw || !Number.isInteger(value) || value<0 || value>255)
            throw new Error('Each RGB channel must be an integer from 0 to 255.');
        return value;
    }

    function light_hex_from_channels() {
        var channels=['lightRedChannel','lightGreenChannel','lightBlueChannel'];
        return '#'+channels.map(function(id) {
            return channel_byte(id).toString(16).padStart(2,'0');
        }).join('').toUpperCase();
    }

    function light_settings_message(message,mode) {
        var node=element('lightSettingsStatus');
        if (node) { node.textContent=message; node.className='rtdt-dialog-note '+(mode||'info'); }
    }

    function sync_light_colour(hex) {
        if (!/^#[0-9a-fA-F]{6}$/.test(hex))
            throw new Error('Enter a full 24-bit RGB colour in #RRGGBB format.');
        var canonical=hex.toUpperCase();
        element('lightColour').value=canonical.toLowerCase();
        element('lightHex').value=canonical;
        element('lightRedChannel').value=String(parseInt(canonical.slice(1,3),16));
        element('lightGreenChannel').value=String(parseInt(canonical.slice(3,5),16));
        element('lightBlueChannel').value=String(parseInt(canonical.slice(5,7),16));
        element('lightPreview').style.backgroundColor=canonical;
        light_settings_message('Ready to apply '+canonical+' to the point light.','info');
        return canonical;
    }

    function open_light_settings() {
        var light=RtDtState.scene && RtDtState.scene.l;
        var rgb=light && light.intensity ?
            rtdt_colour.to_hex(light.intensity) : '#ffffff';
        sync_light_colour(rgb);
        light_settings_message(light ?
            'Point light ready. Colour is stored as 24-bit RGB.' :
            'Load a scene before applying light settings.',light?'info':'error');
        open_dialog('lightsModal');
    }

    function apply_light() {
        if (running || playback_active) {
            light_settings_message('Stop rendering or animation before changing light settings.','error');
            return;
        }
        if (!scene_loaded || !RtDtState.scene.l) {
            light_settings_message('Load a scene before applying the point-light colour.','error');
            return;
        }
        try {
            var hex=sync_light_colour(element('lightHex').value.trim());
            var selected=rtdt_colour.from_hex(hex);
            RtDtState.scene.l.intensity=colour(selected.r,selected.g,selected.b);
            pixels=null;
            status('mainStatus','Point-light colour updated: '+hex+'. Render to see the result.','success');
            close_dialog('lightsModal');
        } catch(error) {
            light_settings_message(error.message,'error');
        }
    }

    function set_light(r,g,b) {
        sync_light_colour(rtdt_colour.to_hex({r:r,g:g,b:b}));
    }

    function divide_scene() {

        if (running) {
            status('mainStatus', 'Stop rendering before rebuilding BVH.', 'error');
            return;
        }
        if (!scene_loaded) {

            status('mainStatus', 'Load a scene first.', 'error');
            return;
        }
        var threshold = Number(element('bvhThreshold').value);
        if (!isFinite(threshold) || threshold < 1 || threshold !== Math.floor(threshold)) {

            status('mainStatus', 'BVH threshold must be a positive integer.', 'error');
            return;
        }
        RtDtState.renderOptions.bvhThreshold = threshold;
        var before=count_bvh_groups(RtDtState.scene.o);
        var success=doDivide();
        var after=count_bvh_groups(RtDtState.scene.o);
        var added=Math.max(0,after-before);
        var message=success ?
            (added ? 'BVH optimised: threshold '+threshold+', '+added+' subgroup(s) created.' :
                'BVH checked: threshold '+threshold+'; no new subgroups needed.') :
            'BVH optimisation failed.';
        var indicator=element('bvhStatus');
        if (indicator) {
            indicator.textContent=message;
            indicator.className='rtdt-bvh-status '+(success?'success':'error');
        }
        status('mainStatus',message,success?'success':'error');
    }

    function cancel_render() {

        cancelled = true;
    }

    function draw_scanlines(canvas, count) {

        var context = canvas.getContext('2d');
        var start = render_index - count;
        var data = context.createImageData(WIDTH, count);

        for (var row = 0; row < count; row++) {

            for (var x = 0; x < WIDTH; x++) {

                var c = colorTo255(pixels[(start + row) * WIDTH + x]);
                var p = (row * WIDTH + x) * 4;
                data.data[p] = c.r;
                data.data[p + 1] = c.g;
                data.data[p + 2] = c.b;
                data.data[p + 3] = 255;
            }
        }

        context.putImageData(data, 0, start);
    }

    function finish_render(message, mode) {

        running = false;
        element('btnAbort').style.display = 'none';
        element('btnRender').disabled = false;
        status('renderStatus', message, mode);
        render_progress(mode === 'success' ? 100 : 0, mode === 'success');
        if (mode === 'success') workflow(3);
        if (playback_active) {
            if (mode !== 'success') stop_animation(false);
            else if (playback_frame < playback_total) {
                playback_frame++;
                setTimeout(render_animation_frame,0);
            } else stop_animation(true);
        }
    }

    function start_render() {

        if (running || !scene_loaded)
            return;

        if (active_scene_assets.some(function (asset) { return asset.required && asset.status !== 'loaded'; })) {
            status('renderStatus', 'Required assets have not been resolved. Load the missing scene files before rendering.', 'error');
            return;
        }
        var width = Number(element('renderWidth').value);
        var height = Number(element('renderHeight').value);
        var depth = Number(element('renderQuality').value);
        if (width < 1 || height < 1 || depth < 1 || width !== Math.floor(width) ||
            height !== Math.floor(height) || !isFinite(width * height) ||
            width * height > 4000000) {

            status('renderStatus', 'Invalid render settings.', 'error');
            return;
        }

        var previous = RtDtState.scene.c;
        WIDTH = width;
        HEIGHT = height;
        RtDtState.scene.c = new camera(width, height, previous.field_of_view || Math.PI / 4);
        RtDtState.scene.c.setCTransform(previous.transform);

        var canvas = element('canvas');
        canvas.width = width;
        canvas.height = height;
        var render_world = new world();
        render_world.light = RtDtState.scene.l;
        render_world.objects = RtDtState.scene.o.s || [RtDtState.scene.o];

        pixels = new Array(width * height);
        render_index = 0;
        cancelled = false;
        running = true;
        element('btnRender').disabled = true;
        element('btnAbort').style.display = 'block';
        render_progress(0, true);
        viewport_meta(width + ' × ' + height + ' · rendering');
        workflow(2);
        status('renderStatus', 'Rendering...', 'info');

        function next_batch() {

            if (cancelled) {

                pixels = null;
                finish_render('Render stopped.', 'info');
                return;
            }

            try {

                var count = Math.min(4, height - render_index);

                for (var row = 0; row < count; row++) {

                    var y = render_index + row;
                    for (var x = 0; x < width; x++) {

                        var ray = RtDtState.scene.c.ray_for_pixel(x, y);
                        var c = color_at(render_world, ray, depth);
                        if (c.r === 0 && c.g === 0 && c.b === 0)
                            c = RENDER_BG_COLOR;

                        pixels[y * width + x] = c;
                    }
                }

                render_index += count;
                draw_scanlines(canvas, count);
                render_progress(Math.round(100 * render_index / height), true);
                status('renderStatus', 'Rendering ' +
                    Math.round(100 * render_index / height) + '%', 'info');

                if (render_index < height)
                    setTimeout(next_batch, 0);
                else
                    finish_render('Render complete: ' + width + ' × ' + height, 'success');
            } catch (error) {

                pixels = null;
                finish_render('Render failed: ' + error.message, 'error');
            }
        }

        setTimeout(next_batch, 0);
    }

    function download_image() {

        if (!pixels) {

            status('mainStatus', 'Render an image before exporting.', 'error');
            return;
        }
        var format = element('exportFormat').value;

        try {

            if (format === 'png' || format === 'jpeg')
                rtdt_image_io_browser.export_canvas(element('canvas'), format);
            else if (format === 'bmp')
                rtdt_image_io_browser.export_rgb_bmp(pixels, WIDTH, HEIGHT);
            else if (format === 'ppm')
                rtdt_image_io_browser.export_ppm(pixels, WIDTH, HEIGHT);
            else if (format === 'c64' || format === 'ansi256' || format === 'gray8')
                rtdt_image_io_browser.export_indexed_bmp(pixels, WIDTH, HEIGHT, format);
            else
                throw new Error('Unsupported export format: ' + format);

            status('mainStatus', 'Export started: ' + format + '.', 'success');
            workflow(4);
        } catch (error) {

            status('mainStatus', error.message, 'error');
        }
    }

    function refresh_objects() {

        var select = element('materialTarget');
        if (!select)
            return;

        select.options.length = 0;
        var objects = scene_loaded && RtDtState.scene.o && RtDtState.scene.o.s ? RtDtState.scene.o.s : [];
        for (var i = 0; i < objects.length; i++) {

            var option = document.createElement('option');
            option.value = i;
            option.textContent = (i + 1) + ': ' + (objects[i].type || 'shape');
            select.appendChild(option);
        }
    }

    function import_image() {

        var file = element('imageFile').files[0];
        if (!file) {

            status('mainStatus', 'Choose an image file.', 'error');
            return;
        }
        rtdt_image_io_browser.decode_file(file, function (error, image) {

            if (error) {

                status('mainStatus', error.message, 'error');
                return;
            }

            images[file.name] = image;
            selected_image_name = file.name;
            RtDtState.scene.PPM[file.name] = image;
            element('imageInfo').textContent = file.name + ': ' +
                image.width + ' × ' + image.height + ' RGB';
            status('mainStatus', 'Image imported: ' + file.name, 'success');
        });
    }

    function apply_image() {

        var file = element('imageFile').files[0];
        var image = (file && images[file.name]) ||
            (selected_image_name && images[selected_image_name]);
        var purpose = element('imagePurpose').value;
        var target_index = Number(element('materialTarget').value);

        if (!image || !scene_loaded || !RtDtState.scene.o.s[target_index]) {

            status('mainStatus', 'Load a scene and import an image first.', 'error');
            return;
        }

        if (purpose !== 'albedo') {

            status('mainStatus', 'Normal/height map shading is not implemented yet. Image retained as an asset.', 'info');
            return;
        }

        var target = RtDtState.scene.o.s[target_index];
        if (target.type !== 'sphere' && target.type !== 'plane') {

            status('mainStatus', 'Select a sphere or plane for image mapping. Mesh UV mapping is pending.', 'error');
            return;
        }

        var mapping = target.type === 'sphere' ? spherical_map : planar_map;
        target.material.pattern = texture_pattern(texture_map(image_pattern(image), mapping));
        status('mainStatus', 'Albedo texture applied to ' + target.type + '.', 'success');
        close_dialog('imageModal');
    }

    function import_obj() {

        if (running) {
            status('mainStatus', 'Stop rendering before importing a mesh.', 'error');
            return;
        }
        var file = element('objFile').files[0];
        if (!file)
            return;

        var reader = new FileReader();
        reader.onload = function () {

            try {

                RtDtState.meshImport.objFileContents = reader.result;
                parse_obj_file();
                scene_loaded = true;
                pixels = null;
                refresh_objects();
                status('mainStatus', 'OBJ mesh imported.', 'success');
            } catch (error) {

                status('mainStatus', error.message, 'error');
            }
        };
        reader.onerror = function () {

            status('mainStatus', 'Could not read OBJ file.', 'error');
        };
        reader.readAsText(file);
    }

    function bind(id, event_name, action) {

        var node = element(id);
        if (node)
            node.addEventListener(event_name, action, false);
    }

    function close_project() {

        cancel_render();
        pixels = null;
        scene_loaded = false;
        repository_request++;
        scene_load_token++;
        stop_animation();
        reset_bvh_status();
        show_scene_assets([], 'Load a scene to inspect its dependencies.');
        render_progress(0, false);
        viewport_meta('No scene loaded');
        workflow(0);
        phy_model = null;
        phy_animator = null;
        RtDtState.scene.o = {};
        refresh_objects();
        status('mainStatus', 'Project cleared. Load a new scene.', 'info');
    }

    function bind_menubar() {

        var menus = document.querySelectorAll('.rtdt-menu');

        function close_menus() {

            for (var i = 0; i < menus.length; i++) {

                menus[i].className = menus[i].className.replace(/\s*open\b/g, '');
                menus[i].querySelector('.rtdt-menu-toggle').setAttribute('aria-expanded', 'false');
            }
        }

        for (var i = 0; i < menus.length; i++) {

            (function (menu) {

                var toggle = menu.querySelector('.rtdt-menu-toggle');
                toggle.addEventListener('click', function (event) {

                    var was_open = /\bopen\b/.test(menu.className);
                    close_menus();
                    if (!was_open) {

                        menu.className += ' open';
                        toggle.setAttribute('aria-expanded', 'true');
                    }
                    event.stopPropagation();
                });
            }(menus[i]));
        }

        document.addEventListener('click', function (event) {

            var action = event.target.getAttribute && event.target.getAttribute('data-menu-action');
            if (!action) {

                if (!event.target.closest || !event.target.closest('.rtdt-menu'))
                    close_menus();
                return;
            }

            close_menus();
            var actions = {
                'open-obj': function () { open_import('obj','local'); },
                'open-image': function () { refresh_objects(); open_dialog('imageModal'); },
                'repo-samples': function () { open_import('scene','repo'); },
                'export': download_image,
                'close-project': close_project,
                'render': start_render,
                'stop': cancel_render,
                'bvh': divide_scene,
                'bvh-threshold': function () { element('bvhThreshold').focus(); },
                'camera': function () { open_dialog('cameraModal'); },
                'lights': open_light_settings,
                'keyboard': function () { open_dialog('keyboardModal'); },
                'contents': function () { open_dialog('keyboardModal'); },
                'select-shape': function () { refresh_objects(); open_dialog('imageModal'); },
                'bug': function () { window.open('https://github.com/inventordave2/RTDT/issues/new', '_blank'); },
                'about': function () { open_dialog('aboutModal'); }
            };
            if (actions[action])
                actions[action]();
        }, false);

        document.addEventListener('keydown', function (event) {

            if (event.key === 'Escape')
                close_menus();
        }, false);
    }

    function initialise() {

        if (typeof rtdt_colour === 'undefined' || typeof initRaytracer !== 'function') {

            status('mainStatus', 'Required RtDt scripts are missing.', 'error');
            return;
        }

        /* Built-in scenes call these legacy browser hooks; this controller
           deliberately separates scene construction from user-triggered render. */
        initRaytracer(800, 600);
        element('mainStatus').style.display = 'block';
        status('mainStatus', 'RtDt ready. Load a scene to begin.', 'success');

        bind_menubar();
        workflow(0);
        set_scene_source();
        bind('btnLoadScene', 'click', load_selected_scene);
        bind('sceneSource', 'change', set_scene_source);
        bind('btnAssetMesh', 'click', function () { open_import('obj', element('assetDefaultSource').value); });
        bind('btnAssetTexture', 'click', function () { open_import('image', element('assetDefaultSource').value); });
        bind('btnOpenImport', 'click', function () { open_import('scene','repo'); });
        bind('btnOpenSceneFile', 'click', function () { open_import('scene',element('assetDefaultSource').value); });
        bind('btnOpenPhyFile', 'click', function () { open_import('phy',element('assetDefaultSource').value); });
        bind('btnImportSelected', 'click', import_selected_file);
        bind('importKind', 'change', update_import_fields);
        bind('importSource', 'change', update_import_fields);
        bind('btnTimeBack', 'click', function () { step_phy_frame(-1); });
        bind('btnTimeForward', 'click', function () { step_phy_frame(1); });
        var resolutionButtons = document.querySelectorAll('[data-render-size]');
        for (var preset = 0; preset < resolutionButtons.length; preset++) {
            resolutionButtons[preset].addEventListener('click', function () {
                var parts = this.getAttribute('data-render-size').split('x');
                set_resolution(Number(parts[0]), Number(parts[1]));
            });
        }
        bind('btnLoadPhy', 'click', load_phy);
        bind('btnApplyPhy', 'click', apply_phy);
        bind('btnPlayPhy', 'click', play_animation);
        bind('btnStopPhy', 'click', function () { stop_animation(false); });
        bind('btnRender', 'click', start_render);
        bind('btnAbort', 'click', cancel_render);
        bind('btnUpdateCamera', 'click', change_camera);
        bind('btnOpenCamera', 'click', function () { open_dialog('cameraModal'); });
        bind('btnOpenLights', 'click', open_light_settings);
        bind('btnOpenImage', 'click', function () { refresh_objects(); open_dialog('imageModal'); });
        bind('btnShowKeyboard', 'click', function () { open_dialog('keyboardModal'); });
        bind('btnBVH', 'click', divide_scene);
        bind('cameraPreset', 'change', camera_preset);
        bind('btnApplyLight', 'click', apply_light);
        bind('lightColour', 'input', function () {
            try { sync_light_colour(element('lightColour').value); }
            catch(error) { light_settings_message(error.message,'error'); }
        });
        bind('lightHex', 'change', function () {
            try { sync_light_colour(element('lightHex').value.trim()); }
            catch(error) { light_settings_message(error.message,'error'); }
        });
        ['lightRedChannel','lightGreenChannel','lightBlueChannel'].forEach(function(id) {
            bind(id,'change',function() {
                try { sync_light_colour(light_hex_from_channels()); }
                catch(error) { light_settings_message(error.message,'error'); }
            });
        });
        bind('btnImportImage', 'click', import_image);
        bind('btnApplyImage', 'click', apply_image);
        bind('objFile', 'change', import_obj);
        bind('btnDownload', 'click', download_image);
        bind('lightWhite', 'click', function () { set_light(1, 1, 1); });
        bind('lightWarm', 'click', function () { set_light(1, 0.88, 0.67); });
        bind('lightRed', 'click', function () { set_light(1, 0.2, 0.2); });
        bind('lightGreen', 'click', function () { set_light(0.2, 1, 0.35); });
        bind('lightBlue', 'click', function () { set_light(0.25, 0.45, 1); });

        var closers = document.querySelectorAll('[data-close-dialog]');
        for (var i = 0; i < closers.length; i++) {

            closers[i].addEventListener('click', function () {

                close_dialog(this.getAttribute('data-close-dialog'));
            });
        }

        document.addEventListener('keydown', function (event) {

            var tag = (event.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select')
                return;
            if (event.key === 'r' || event.key === 'R')
                start_render();
            else if (event.key === 's' || event.key === 'S')
                cancel_render();
            else if (event.key === '?')
                open_dialog('keyboardModal');
            else if (event.key === 'Escape') {

                close_dialog('keyboardModal');
                close_dialog('cameraModal');
                close_dialog('lightsModal');
                close_dialog('imageModal');
                close_dialog('importModal');
            }
        });
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', initialise);
    else
        initialise();

    return {open_import: open_import, import_selected_file: import_selected_file,
        set_scene_source: set_scene_source, load_selected_scene: load_selected_scene,
        scene_assets: scene_assets,
        load_scene: load_scene, load_phy: load_phy, apply_phy: apply_phy,
        load_repository_sample: load_repository_sample,
        start_render: start_render,
        cancel_render: cancel_render, set_resolution: set_resolution,
        play_animation: play_animation, stop_animation: stop_animation,
        step_phy_frame: step_phy_frame, import_image: import_image,
        apply_image: apply_image, apply_light: apply_light,
        divide_scene: divide_scene};
}());

/* Legacy built-in scene constructors still call these two functions.
 * They intentionally do not initiate a second render.
 */
function prepCanvas() {}
function renderImage() {}
