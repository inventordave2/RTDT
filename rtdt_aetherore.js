/* RtDt AetherOre: .phy evaluator and keyframe world animator.
 * Version 1 documents are JSON, not executable JavaScript.
 * Requires RtDt matrix modules for compose/apply; optional rtdt_ap_math for
 * quoted decimal expressions. Node.js 10 and browser compatible.
 */
var rtdt_aetherore = (function () {

    var safe_math = {
        sqrt:Math.sqrt, sin:Math.sin, cos:Math.cos, tan:Math.tan,
        abs:Math.abs, exp:Math.exp, min:Math.min, max:Math.max,
        log10:function (x) { return Math.log(x)/Math.LN10; },
        log2:function (x) { return Math.log(x)/Math.LN2; }
    };

    function parse_phy(source) {

        var model = typeof source === 'string' ? JSON.parse(source) : source;
        if (!model || typeof model !== 'object' || Array.isArray(model) || model.version !== 1)
            throw new Error('Expected .phy version 1 document');
        if (model.objects !== undefined && !Array.isArray(model.objects))
            throw new Error('.phy objects must be an array');
        if (model.timeline && model.timeline.fps !== undefined &&
            (typeof model.timeline.fps !== 'number' || !isFinite(model.timeline.fps) ||
             model.timeline.fps <= 0))
            throw new Error('Invalid .phy fps');
        var names = {};
        (model.objects || []).forEach(function (track) {

            if (!track || typeof track.id !== 'string' || !track.id ||
                Object.prototype.hasOwnProperty.call(names, track.id))
                throw new Error('Missing or duplicate .phy object id');
            names[track.id] = true;
            var motion = track.motion || {};
            ['position','rotation','scale','shear'].forEach(function (key) {

                if (!motion[key]) return;
                if (!Array.isArray(motion[key]) || !motion[key].length)
                    throw new Error('Invalid '+key+' keyframes');
                var previous = -Infinity;
                motion[key].forEach(function (frame) {

                    if (!frame || typeof frame.time !== 'number' || !isFinite(frame.time) ||
                        frame.time < 0 || frame.time <= previous || !Array.isArray(frame.value) ||
                        frame.value.length !== (key === 'shear' ? 6 : 3))
                        throw new Error('Invalid '+key+' keyframe');
                    frame.value.forEach(function (v) {

                        if (typeof v !== 'string' && (typeof v !== 'number' || !isFinite(v)))
                            throw new Error('Invalid keyframe component');
                    });
                    previous = frame.time;
                });
            });
        });
        return model;
    }

    function compile_expression(source) {

        if (typeof source !== 'string')
            throw new TypeError('Expression must be a string');
        var tokens = [], i = 0, match;
        while (i < source.length) {

            var rest = source.slice(i);
            match = /^\s+/.exec(rest);
            if (match) { i += match[0].length; continue; }
            match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
            if (match) {

                tokens.push({kind:'number',value:match[0]});
                i += match[0].length;
                continue;
            }
            match = /^[A-Za-z_][A-Za-z_0-9]*/.exec(rest);
            if (match) {

                tokens.push({kind:'name',value:match[0]});
                i += match[0].length;
                continue;
            }
            if ('()+-*/^,'.indexOf(source.charAt(i)) >= 0) {

                tokens.push({kind:'symbol',value:source.charAt(i++)});
                continue;
            }
            throw new SyntaxError('Invalid expression character at '+i);
        }
        tokens.push({kind:'end',value:''});
        var cursor = 0, precedence = {'+':10,'-':10,'*':20,'/':20,'^':30};

        function require_token(value) {

            if (tokens[cursor].value !== value)
                throw new SyntaxError('Expected '+value);
            cursor++;
        }

        function atom() {

            var token = tokens[cursor++];
            if (token.value === '+' || token.value === '-')
                return {kind:'unary',sign:token.value,arg:expression(25)};
            if (token.value === '(') {

                var inner = expression(0);
                require_token(')');
                return inner;
            }
            if (token.kind === 'number')
                return {kind:'number',value:token.value};
            if (token.kind === 'name') {

                if (tokens[cursor].value === '(') {

                    cursor++;
                    var args = [];
                    if (tokens[cursor].value !== ')') {

                        args.push(expression(0));
                        while (tokens[cursor].value === ',') {

                            cursor++;
                            args.push(expression(0));
                        }
                    }
                    require_token(')');
                    return {kind:'call',name:token.value,args:args};
                }
                return {kind:'variable',name:token.value};
            }
            throw new SyntaxError('Unexpected expression token');
        }

        function expression(minimum) {

            var left = atom();
            while (Object.prototype.hasOwnProperty.call(precedence,tokens[cursor].value) &&
                precedence[tokens[cursor].value] >= minimum) {

                var op = tokens[cursor++].value;
                left = {kind:'binary',op:op,left:left,
                    right:expression(precedence[op] + (op === '^' ? 0 : 1))};
            }
            return left;
        }
        var tree = expression(0);
        if (tokens[cursor].kind !== 'end')
            throw new SyntaxError('Unexpected trailing expression token');
        return tree;
    }

    function evaluate_expression(source, variables, options) {

        var tree = typeof source === 'string' ? compile_expression(source) : source;
        var vars = variables || {}, settings = options || {};
        var decimal = settings.precision === 'decimal';
        var ap = settings.ap || (typeof rtdt_ap_math !== 'undefined' ? rtdt_ap_math : null);
        var places = settings.places === undefined ? 40 : settings.places;
        if (decimal && !ap)
            throw new Error('Decimal precision requires rtdt_ap_math');

        function visit(node) {

            if (node.kind === 'number')
                return decimal ? node.value : Number(node.value);
            if (node.kind === 'variable') {

                if (!Object.prototype.hasOwnProperty.call(vars,node.name))
                    throw new Error('Unknown .phy variable: '+node.name);
                var value = vars[node.name];
                if (typeof value !== 'number' && typeof value !== 'string')
                    throw new Error('Invalid variable type: '+node.name);
                if (decimal) {

                    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(value)))
                        throw new Error('Invalid decimal variable: '+node.name);
                    return String(value);
                }
                value = Number(value);
                if (!isFinite(value)) throw new Error('Non-finite variable');
                return value;
            }
            if (node.kind === 'unary') {

                var u = visit(node.arg);
                return node.sign === '+' ? u : (decimal ? ap.SUB('0',u) : -u);
            }
            if (node.kind === 'binary') {

                var a = visit(node.left), b = visit(node.right);
                if (decimal) {

                    if (node.op === '+') return ap.ADD(a,b);
                    if (node.op === '-') return ap.SUB(a,b);
                    if (node.op === '*') return ap.MUL(a,b);
                    if (node.op === '/') return ap.DIV(a,b,places);
                    throw new Error('Decimal exponentiation not implemented');
                }
                if (node.op === '+') return a+b;
                if (node.op === '-') return a-b;
                if (node.op === '*') return a*b;
                if (node.op === '/') return a/b;
                if (node.op === '^') return Math.pow(a,b);
            }
            if (node.kind === 'call') {

                var fn = node.name.toLowerCase(), args = node.args.map(visit);
                if (decimal) {

                    if (args.length === 1 && fn === 'sqrt') return ap.SQRT(args[0],places);
                    if (args.length === 1 && fn === 'log10') return ap.LOG10(args[0],places);
                    if (args.length === 1 && fn === 'log2') return ap.LOG2(args[0],places);
                    throw new Error('Unsupported AP function: '+fn);
                }
                if (!Object.prototype.hasOwnProperty.call(safe_math,fn))
                    throw new Error('Unknown function: '+fn);
                return safe_math[fn].apply(null,args);
            }
            throw new Error('Invalid expression syntax tree');
        }

        var result = visit(tree);
        if (!decimal && !isFinite(result))
            throw new RangeError('Non-finite expression result');
        return result;
    }

    function resolved(value,time,variables,options) {

        if (typeof value === 'number') return value;
        var scoped = {t:time};
        Object.keys(variables || {}).forEach(function (key) {

            if (key === 't') throw new Error('t is reserved for time');
            scoped[key] = variables[key];
        });
        var out = Number(evaluate_expression(value,scoped,options));
        if (!isFinite(out))
            throw new RangeError('Transform cannot be represented as binary64');
        return out;
    }

    function channel_at(frames,time,variables,options) {

        if (time <= frames[0].time)
            return frames[0].value.map(function (v) { return resolved(v,time,variables,options); });
        var last = frames[frames.length-1];
        if (time >= last.time)
            return last.value.map(function (v) { return resolved(v,time,variables,options); });
        for (var i = 1; i < frames.length; i++) {

            var end = frames[i];
            if (time <= end.time) {

                var begin = frames[i-1], amount = (time-begin.time)/(end.time-begin.time);
                return begin.value.map(function (v,j) {

                    var a = resolved(v,time,variables,options);
                    var b = resolved(end.value[j],time,variables,options);
                    return a+(b-a)*amount;
                });
            }
        }
    }

    function evaluate(model,time,variables,options) {

        parse_phy(model);
        if (typeof time !== 'number' || !isFinite(time) || time < 0)
            throw new RangeError('Time must be a nonnegative finite number');
        var result = {};
        (model.objects || []).forEach(function (track) {

            var pose = {}, motion = track.motion || {};
            ['position','rotation','scale','shear'].forEach(function (channel) {

                if (motion[channel])
                    pose[channel] = channel_at(motion[channel],time,variables,options);
            });
            result[track.id] = pose;
        });
        return result;
    }

    function compose(pose) {

        if (typeof identity_matrix !== 'function' ||
            typeof m_multiply !== 'function' || typeof translation !== 'function' ||
            typeof rotation_x !== 'function' || typeof rotation_y !== 'function' ||
            typeof rotation_z !== 'function' || typeof shearing !== 'function' ||
            typeof scaling !== 'function')
            throw new Error('RtDt matrix modules must be loaded first');
        var p = pose.position || [0,0,0], r = pose.rotation || [0,0,0],
            s = pose.scale || [1,1,1], h = pose.shear || [0,0,0,0,0,0];
        var transform = translation(p[0],p[1],p[2]);
        transform = m_multiply(transform,rotation_z(r[2]));
        transform = m_multiply(transform,rotation_y(r[1]));
        transform = m_multiply(transform,rotation_x(r[0]));
        transform = m_multiply(transform,shearing.apply(null,h));
        return m_multiply(transform,scaling(s[0],s[1],s[2]));
    }

    function create_animator(source,bindings,options) {

        var model = parse_phy(source), objects = bindings || {}, originals = {};
        Object.keys(objects).forEach(function (id) {

            if (!objects[id] || !Array.isArray(objects[id].transform))
                throw new Error('Missing original transform: '+id);
            originals[id] = objects[id].transform.map(function (row) { return row.slice(); });
        });
        (model.objects || []).forEach(function (track) {

            if (!Object.prototype.hasOwnProperty.call(objects,track.id))
                throw new Error('Unknown animation target: '+track.id);
        });
        return {
            at:function (time,variables) {

                var poses = evaluate(model,time,variables,options), result = {};
                Object.keys(poses).forEach(function (id) {

                    var matrix = m_multiply(originals[id],compose(poses[id]));
                    /* Setter invalidates RtDt intersection and bounds caches. */
                    objects[id].transform = matrix;
                    result[id] = matrix;
                });
                return result;
            },
            reset:function () {

                Object.keys(originals).forEach(function (id) {

                    objects[id].transform = originals[id].map(function (row) { return row.slice(); });
                });
            }
        };
    }

    return {
        parse_phy:parse_phy,compile_expression:compile_expression,
        evaluate_expression:evaluate_expression,evaluate:evaluate,
        compose:compose,create_animator:create_animator
    };
}());

if (typeof module !== 'undefined' && module.exports)
    module.exports = rtdt_aetherore;
