/* RtDt browser image I/O: no npm or external assets.
 * Material textures use packed RGB data; map interpretation is handled by materials.
 */
var rtdt_image_io_browser = (function () {

    function parse_ppm(text) {

        var items = String(text).replace(/#[^\r\n]*/g, '').trim().split(/\s+/);
        var magic = items.shift();
        if (magic !== 'P3')
            throw new Error('Expected a plain-text P3 PPM image');

        var width = Number(items.shift());
        var height = Number(items.shift());
        var maximum = Number(items.shift());
        if (!isFinite(width) || !isFinite(height) || width < 1 || height < 1 ||
            width !== Math.floor(width) || height !== Math.floor(height) ||
            width * height > 100000000 || maximum < 1 || maximum > 65535 ||
            maximum !== Math.floor(maximum))
            throw new Error('Invalid PPM image header');

        if (items.length !== width * height * 3)
            throw new Error('PPM pixel count does not match dimensions');

        var data = new Uint8Array(items.length);
        for (var i = 0; i < items.length; i++) {

            var value = Number(items[i]);
            if (!isFinite(value) || value !== Math.floor(value) ||
                value < 0 || value > maximum)
                throw new Error('Invalid PPM channel at position ' + i);

            data[i] = Math.round(value * 255 / maximum);
        }

        return { width: width, height: height, data: data, profile: 'RGB' };
    }

    function decode_file(file, done) {

        if (!file) {

            done(new Error('Select an image file.'));
            return;
        }

        var name = file.name.toLowerCase();
        if (/\.ppm$/.test(name)) {

            var reader = new FileReader();
            reader.onload = function () {

                try {

                    done(null, parse_ppm(reader.result));
                } catch (error) {

                    done(error);
                }
            };
            reader.onerror = function () {

                done(new Error('Could not read PPM file.'));
            };
            reader.readAsText(file);
            return;
        }

        if (!/\.(png|jpe?g|bmp)$/.test(name)) {

            done(new Error('Supported imports: PNG, JPEG, BMP and P3 PPM.'));
            return;
        }

        var url = URL.createObjectURL(file);
        var image = new Image();
        image.onload = function () {

            try {

                var canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                var context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                var rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
                var rgb = new Uint8Array(canvas.width * canvas.height * 3);

                for (var i = 0, j = 0; i < rgba.length; i += 4) {

                    /* Straight-alpha composited on white for opaque material albedo. */
                    var alpha = rgba[i + 3] / 255;
                    rgb[j++] = Math.round(rgba[i] * alpha + 255 * (1 - alpha));
                    rgb[j++] = Math.round(rgba[i + 1] * alpha + 255 * (1 - alpha));
                    rgb[j++] = Math.round(rgba[i + 2] * alpha + 255 * (1 - alpha));
                }

                done(null, { width: canvas.width, height: canvas.height,
                    data: rgb, profile: 'RGB' });
            } catch (error) {

                done(error);
            } finally {

                URL.revokeObjectURL(url);
            }
        };
        image.onerror = function () {

            URL.revokeObjectURL(url);
            done(new Error('Browser could not decode this image.'));
        };
        image.src = url;
    }

    function download_blob(blob, name) {

        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function export_canvas(canvas, format) {

        var mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        var name = 'render.' + (format === 'jpeg' ? 'jpg' : 'png');
        if (canvas.toBlob) {

            canvas.toBlob(function (blob) {

                if (blob)
                    download_blob(blob, name);
            }, mime, 0.94);
        }
        else {

            var a = document.createElement('a');
            a.download = name;
            a.href = canvas.toDataURL(mime, 0.94);
            a.click();
        }
    }

    function export_ppm(pixels, width, height) {

        var rows = ['P3', width + ' ' + height, '255'];

        for (var y = 0; y < height; y++) {

            var row = [];
            for (var x = 0; x < width; x++) {

                var c = pixels[y * width + x];
                var rgb = colorTo255(c);
                row.push(rgb.r + ' ' + rgb.g + ' ' + rgb.b);
            }
            rows.push(row.join(' '));
        }

        download_blob(new Blob([rows.join('\n') + '\n'], {
            type: 'image/x-portable-pixmap'
        }), 'render.ppm');
    }

    function export_rgb_bmp(pixels, width, height) {
        if (typeof rtdt_colour === 'undefined')
            throw new Error('RtDt colour module has not loaded');

        var bytes = rtdt_colour.rgb_bmp(pixels, width, height);
        download_blob(new Blob([bytes], {type: 'image/bmp'}), 'render.bmp');
    }

    function export_indexed_bmp(pixels, width, height, palette_name) {

        if (typeof rtdt_colour === 'undefined')
            throw new Error('RtDt colour module has not loaded');

        var bytes = rtdt_colour.indexed_bmp(pixels, width, height, palette_name);
        download_blob(new Blob([bytes], {type: 'image/bmp'}), 'render-' + palette_name + '.bmp');
    }

    return {parse_ppm: parse_ppm, decode_file: decode_file,
        download_blob: download_blob, export_canvas: export_canvas,
        export_ppm: export_ppm, export_rgb_bmp: export_rgb_bmp,
        export_indexed_bmp: export_indexed_bmp};
}());
