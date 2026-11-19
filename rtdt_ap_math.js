/* RtDt AP decimal mathematics. Ported from inventordave2/APLIB:
 * aplib.c column arithmetic, native.c Newton SQRT and fractional-root LOG.
 * Node 10, no dependencies, decimal-string operands and results.
 * ADD/SUB/MUL exact; DIV/SQRT/LOG round half away from zero to decimal places.
 */
var rtdt_ap_math = (function () {

    function precision(p) {

        if (p === undefined) return 40;
        if (typeof p !== 'number' || !isFinite(p) || p < 0 || p > 900 || Math.floor(p) !== p)
            throw new RangeError('places must be an integer from 0 to 900');
        return p;
    }

    function trim(s) {

        return s.replace(/^0+(?=\d)/, '') || '0';
    }

    function make(sign, digits, scale) {

        digits = trim(digits);
        if (digits === '0') return {sign:0,digits:'0',scale:0};
        while (scale > 0 && digits.charAt(digits.length-1) === '0') {

            digits = digits.slice(0,-1);
            scale--;
        }
        return {sign:sign < 0 ? -1 : 1,digits:digits,scale:scale};
    }

    function parse(s) {

        if (typeof s !== 'string') throw new TypeError('AP operands must be decimal strings');
        var m = /^\s*([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?\s*$/.exec(s);
        if (!m) throw new SyntaxError('Invalid decimal: '+s);
        var whole=m[2]||'0', frac=m[3]||m[4]||'', exp=m[5]===undefined?0:Number(m[5]);
        if (!isFinite(exp)||Math.abs(exp)>10000||whole.length+frac.length>10000)
            throw new RangeError('Decimal input exceeds limits');
        return make(m[1]==='-'?-1:1,whole+frac,frac.length-exp);
    }

    function format(n) {

        if (!n.sign) return '0';
        var s=n.digits;
        if (n.scale<0) s+=new Array(-n.scale+1).join('0');
        else if (n.scale>=s.length&&n.scale>0) s='0.'+new Array(n.scale-s.length+1).join('0')+s;
        else if (n.scale>0) s=s.slice(0,-n.scale)+'.'+s.slice(-n.scale);
        return (n.sign<0?'-':'')+s;
    }

    function cmpd(a,b) {

        a=trim(a);b=trim(b);
        if (a.length!==b.length) return a.length>b.length?1:-1;
        return a===b?0:(a>b?1:-1);
    }

    function addd(a,b) {

        var i=a.length-1,j=b.length-1,carry=0,result='';
        while(i>=0||j>=0||carry) {

            var v=carry+(i>=0?a.charCodeAt(i--)-48:0)+(j>=0?b.charCodeAt(j--)-48:0);
            result=String(v%10)+result;
            carry=Math.floor(v/10);
        }
        return trim(result);
    }

    function subd(a,b) {

        var i=a.length-1,j=b.length-1,borrow=0,result='';
        while(i>=0) {

            var v=a.charCodeAt(i--)-48-borrow-(j>=0?b.charCodeAt(j--)-48:0);
            borrow=v<0?1:0;
            result=String(v<0?v+10:v)+result;
        }
        return trim(result);
    }

    function muld(a,b) {

        if (a==='0'||b==='0') return '0';
        var cells=[],i,j,k,v,carry;
        for(i=0;i<a.length+b.length;i++) cells.push(0);
        for(i=a.length-1;i>=0;i--) {

            carry=0;
            for(j=b.length-1;j>=0;j--) {

                k=i+j+1;
                v=(a.charCodeAt(i)-48)*(b.charCodeAt(j)-48)+cells[k]+carry;
                cells[k]=v%10;
                carry=Math.floor(v/10);
            }
            cells[i]+=carry;
        }
        return trim(cells.join(''));
    }

    function align(a,b) {

        var scale=Math.max(a.scale,b.scale);
        return {a:a.digits+new Array(scale-a.scale+1).join('0'),
            b:b.digits+new Array(scale-b.scale+1).join('0'),scale:scale};
    }

    function cmp(a,b) {

        if (a.sign!==b.sign) return a.sign>b.sign?1:-1;
        if (!a.sign) return 0;
        var v=align(a,b);
        return a.sign*cmpd(v.a,v.b);
    }

    function add(a,b) {

        if (!a.sign) return b;
        if (!b.sign) return a;
        var v=align(a,b);
        if (a.sign===b.sign) return make(a.sign,addd(v.a,v.b),v.scale);
        var c=cmpd(v.a,v.b);
        if (!c) return make(0,'0',0);
        return make(c>0?a.sign:b.sign,c>0?subd(v.a,v.b):subd(v.b,v.a),v.scale);
    }

    function neg(a) {

        return {sign:-a.sign,digits:a.digits,scale:a.scale};
    }

    function mul(a,b) {

        return make(a.sign*b.sign,muld(a.digits,b.digits),a.scale+b.scale);
    }

    function divd(a,b) {

        if (b==='0') throw new RangeError('Division by zero');
        var quotient='',remainder='0';
        for(var i=0;i<a.length;i++) {

            remainder=trim(remainder==='0'?a.charAt(i):remainder+a.charAt(i));
            var digit=0;
            while(cmpd(remainder,b)>=0) {

                remainder=subd(remainder,b);
                digit++;
            }
            quotient+=String(digit);
        }
        return {quotient:trim(quotient),remainder:remainder};
    }

    function div(a,b,places) {

        places=precision(places);
        if (!b.sign) throw new RangeError('Division by zero');
        if (!a.sign) return make(0,'0',0);
        var shift=places+b.scale-a.scale,top=a.digits,bottom=b.digits;
        if (shift>=0) top+=new Array(shift+1).join('0');
        else bottom+=new Array(-shift+1).join('0');
        var result=divd(top,bottom);
        if (cmpd(muld(result.remainder,'2'),bottom)>=0) result.quotient=addd(result.quotient,'1');
        return make(a.sign*b.sign,result.quotient,places);
    }

    function round(a,p) {

        return div(a,parse('1'),p);
    }

    function sqrt(a,places) {

        places=precision(places);
        if (a.sign<0) throw new RangeError('Negative square root');
        if (!a.sign) return a;
        var work=places+12,exponent=a.digits.length-a.scale-1;
        var guess=make(1,'1',-Math.floor(exponent/2)),two=parse('2'),old='';
        for(var i=0;i<250;i++) {

            var next=div(add(guess,div(a,guess,work)),two,work);
            var value=format(next);
            if (value===format(guess)||value===old) return round(next,places);
            old=format(guess);
            guess=next;
        }
        throw new Error('SQRT did not converge');
    }

    function logarithm(x,base,places) {

        places=precision(places);
        if (x.sign<=0) throw new RangeError('LOG requires positive operand');
        var work=places+18,one=parse('1'),b=parse(String(base)),whole=0,target=x;
        while(cmp(target,b)>=0) {

            target=div(target,b,work);
            if (++whole>20000) throw new RangeError('LOG exponent too large');
        }
        while(cmp(target,one)<0) {

            target=mul(target,b);
            if (--whole< -20000) throw new RangeError('LOG exponent too small');
        }
        if (cmp(target,one)===0) return parse(String(whole));
        /* Complementary approach when sqrt(base) > target. */
        var complement=cmp(target,sqrt(b,work))<0;
        if (complement) target=div(b,target,work);
        var root=b,weight=one,product=one,fraction=make(0,'0',0),two=parse('2');
        /* Greedy product b^(1/2), b^(1/4), b^(1/8), ... */
        for(var step=0;step<8*(work+1);step++) {

            root=sqrt(root,work);
            weight=div(weight,two,work);
            if (cmp(root,one)===0||!weight.sign) break;
            var candidate=mul(product,root);
            if (cmp(candidate,target)<=0) {

                product=round(candidate,work);
                fraction=add(fraction,weight);
            }
            if (cmp(product,target)===0) break;
        }
        if (complement) fraction=add(one,neg(fraction));
        return round(add(parse(String(whole)),fraction),places);
    }

    return {
        ADD:function(a,b){return format(add(parse(a),parse(b)));},
        SUB:function(a,b){return format(add(parse(a),neg(parse(b))));},
        MUL:function(a,b){return format(mul(parse(a),parse(b)));},
        DIV:function(a,b,p){return format(div(parse(a),parse(b),p));},
        SQRT:function(a,p){return format(sqrt(parse(a),p));},
        LOG10:function(a,p){return format(logarithm(parse(a),10,p));},
        LOG2:function(a,p){return format(logarithm(parse(a),2,p));}
    };
}());

if (typeof module !== 'undefined' && module.exports)
    module.exports = rtdt_ap_math;
