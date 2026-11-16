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

        try {

            var name = element('sceneSelect').value;
            var factory = scene_factory(name);
            if (!factory)
                throw new Error('Unknown scene: ' + name);

            initRaytracer(Number(element('renderWidth').value),
                Number(element('renderHeight').value));
            factory();

            if (!Data.o || !Data.o.s)
                throw new Error('Scene did not create a group of shapes.');

            scene_loaded = true;
            phy_animator = null;
            pixels = null;
            status('mainStatus', 'Scene loaded: ' + name + '. Ready to render.', 'success');
            refresh_objects();
        } catch (error) {

            status('mainStatus', error.message, 'error');
        }
    }

    function phy_bindings() {

        var bindings = {};
        var objects = Data.o && Data.o.s ? Data.o.s : [];
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
            status('phyStatus', 'Applied .phy pose at t=' + t + 's. Render to view.', 'success');
        } catch (error) {

            status('phyStatus', error.message, 'error');
        }
    }

    function load_phy() {

        var file = element('phyFile').files[0];
        if (!file) {

            status('phyStatus', 'Select a .phy file.', 'error');
            return;
        }
        if (!/\\.phy$/i.test(file.name)) {

            status('phyStatus', 'Expected a .phy file.', 'error');
            return;
        }
        var reader = new FileReader();
        reader.onload = function () {

            try {

                var model = rtdt_aetherore.parse_phy(reader.result);
                if (!scene_loaded)
                    throw new Error('Load the target scene first.');
                /* Check every referenced object before accepting the document. */
                var animator = rtdt_aetherore.create_animator(model, phy_bindings());
                if (running)
                    throw new Error('Stop rendering before loading a .phy file.');
                phy_model = model;
                phy_animator = animator;
                element('phyTime').value = '0';
                apply_phy();
                status('phyStatus', 'Loaded .phy file: ' + file.name + '. Pose t=0 applied.', 'success');
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

            Data.c = new camera(WIDTH, HEIGHT, fov * Math.PI / 180);
            Data.c.setCTransform(view_transform(from, to, up));
            status('mainStatus', 'Camera updated.', 'success');
            close_dialog('cameraModal');
        } catch (error) {

            status('mainStatus', error.message, 'error');
        }
    }

    function camera_preset() {

        var index = Number(element('cameraPreset').value);
        if (!scene_loaded || !Data.presets.camera[index])
            return;
        Data.c.setCTransform(Data.presets.camera[index]);
        status('mainStatus', 'Camera preset applied.', 'success');
    }

    function apply_light() {

        if (!scene_loaded || !Data.l) {

            status('mainStatus', 'Load a scene first.', 'error');
            return;
        }

        var hex = element('lightColour').value;
        var selected = rtdt_colour.from_hex(hex);
        Data.l.intensity = colour(selected.r, selected.g, selected.b);
        status('mainStatus', 'Light colour updated.', 'success');
        close_dialog('lightsModal');
    }

    function set_light(r, g, b) {

        element('lightColour').value = rtdt_colour.to_hex({r:r,g:g,b:b});
    }

    function divide_scene() {

        if (!scene_loaded) {

            status('mainStatus', 'Load a scene first.', 'error');
            return;
        }
        var threshold = Number(element('bvhThreshold').value);
        if (!isFinite(threshold) || threshold < 1 || threshold !== Math.floor(threshold)) {

            status('mainStatus', 'BVH threshold must be a positive integer.', 'error');
            return;
        }
        DataR.divideValue = threshold;
        status('mainStatus', doDivide() ? 'BVH hierarchy generated.' :
            'Could not generate BVH for this scene.', 'info');
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
    }

    function start_render() {

        if (running || !scene_loaded)
            return;

        var width = Number(element('renderWidth').value);
        var height = Number(element('renderHeight').value);
        var depth = Number(element('renderQuality').value);
        if (width < 1 || height < 1 || depth < 1 || width !== Math.floor(width) ||
            height !== Math.floor(height) || !isFinite(width * height) ||
            width * height > 4000000) {

            status('renderStatus', 'Invalid render settings.', 'error');
            return;
        }

        var previous = Data.c;
        WIDTH = width;
        HEIGHT = height;
        Data.c = new camera(width, height, previous.field_of_view || Math.PI / 4);
        Data.c.setCTransform(previous.transform);

        var canvas = element('canvas');
        canvas.width = width;
        canvas.height = height;
        var render_world = new world();
        render_world.light = Data.l;
        render_world.objects = Data.o.s || [Data.o];

        pixels = new Array(width * height);
        render_index = 0;
        cancelled = false;
        running = true;
        element('btnRender').disabled = true;
        element('btnAbort').style.display = 'block';
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

                        var ray = Data.c.ray_for_pixel(x, y);
                        var c = color_at(render_world, ray, depth);
                        if (c.r === 0 && c.g === 0 && c.b === 0)
                            c = RENDER_BG_COLOR;

                        pixels[y * width + x] = c;
                    }
                }

                render_index += count;
                draw_scanlines(canvas, count);
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
            else if (format === 'ppm')
                rtdt_image_io_browser.export_ppm(pixels, WIDTH, HEIGHT);
            else
                rtdt_image_io_browser.export_indexed_bmp(pixels, WIDTH, HEIGHT, format);

            status('mainStatus', 'Export started: ' + format + '.', 'success');
        } catch (error) {

            status('mainStatus', error.message, 'error');
        }
    }

    function refresh_objects() {

        var select = element('materialTarget');
        if (!select)
            return;

        select.options.length = 0;
        var objects = scene_loaded && Data.o && Data.o.s ? Data.o.s : [];
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
            Data.PPM[file.name] = image;
            element('imageInfo').textContent = file.name + ': ' +
                image.width + ' × ' + image.height + ' RGB';
            status('mainStatus', 'Image imported: ' + file.name, 'success');
        });
    }

    function apply_image() {

        var file = element('imageFile').files[0];
        var image = file && images[file.name];
        var purpose = element('imagePurpose').value;
        var target_index = Number(element('materialTarget').value);

        if (!image || !scene_loaded || !Data.o.s[target_index]) {

            status('mainStatus', 'Load a scene and import an image first.', 'error');
            return;
        }

        if (purpose !== 'albedo') {

            status('mainStatus', 'Normal/height map shading is not implemented yet. Image retained as an asset.', 'info');
            return;
        }

        var target = Data.o.s[target_index];
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

        var file = element('objFile').files[0];
        if (!file)
            return;

        var reader = new FileReader();
        reader.onload = function () {

            try {

                OBJFILECONTENTS = reader.result;
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
        phy_model = null;
        phy_animator = null;
        Data.o = {};
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
                'open-obj': function () { element('objFile').click(); },
                'open-image': function () { refresh_objects(); open_dialog('imageModal'); },
                'export': download_image,
                'close-project': close_project,
                'render': start_render,
                'stop': cancel_render,
                'bvh': divide_scene,
                'bvh-threshold': function () { element('bvhThreshold').focus(); },
                'camera': function () { open_dialog('cameraModal'); },
                'lights': function () { open_dialog('lightsModal'); },
                'keyboard': function () { open_dialog('keyboardModal'); },
                'contents': function () { open_dialog('keyboardModal'); },
                'select-shape': function () { refresh_objects(); open_dialog('imageModal'); },
                'bug': function () { window.open('https://github.com/inventordave2/RTDT/issues/new', '_blank'); },
                'about': function () { window.alert('RtDt — JavaScript ray tracer. File / Render / Help controls migrated from the legacy interface.'); }
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
        bind('btnLoadScene', 'click', load_scene);
        bind('btnLoadPhy', 'click', load_phy);
        bind('btnApplyPhy', 'click', apply_phy);
        bind('btnRender', 'click', start_render);
        bind('btnAbort', 'click', cancel_render);
        bind('btnUpdateCamera', 'click', change_camera);
        bind('btnOpenCamera', 'click', function () { open_dialog('cameraModal'); });
        bind('btnOpenLights', 'click', function () { open_dialog('lightsModal'); });
        bind('btnOpenImage', 'click', function () { refresh_objects(); open_dialog('imageModal'); });
        bind('btnShowKeyboard', 'click', function () { open_dialog('keyboardModal'); });
        bind('btnBVH', 'click', divide_scene);
        bind('cameraPreset', 'change', camera_preset);
        bind('btnApplyLight', 'click', apply_light);
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
            }
        });
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', initialise);
    else
        initialise();

    return {load_scene: load_scene, load_phy: load_phy, apply_phy: apply_phy,
        start_render: start_render,
        cancel_render: cancel_render, import_image: import_image,
        apply_image: apply_image, apply_light: apply_light,
        divide_scene: divide_scene};
}());

/* Legacy built-in scene constructors still call these two functions.
 * They intentionally do not initiate a second render.
 */
function prepCanvas() {}
function renderImage() {}
