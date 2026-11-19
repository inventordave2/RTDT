/* Math */

var EPSILON = 0.00001;

function modulusA(a,b)	{
    
    while((a -= b) >= b)
        ;
    
    console.log("Result: " + a)
}

function modulusB(a,b)	{
	
	var q = Math.floor(a/b)
	
	var r = q * b
	
	var result = a - r
	
	console.log("Result: " + result)
	
	// result = a - (Math.floor(a/b) * b)
	
	// Source for method: https://www.omnicalculator.com/math/modulo
}

function equal(a, b)	{ // checks 2 numbers are equal
	
	if (Math.abs(a - b) < EPSILON)
		return true;
	
	return false;
}

function round(n)	{ // unlike Math.round(), only rounds n if dist(n,floor/ceil(n)) < EPSILON
	
	if(equal(n,Math.floor(n)))
		return Math.floor(n)
	
	else if(equal(n,Math.ceil(n)))
		return Math.ceil(n)
	
	return n
}

function round_t(t)	{
	if (t && t.r !== undefined) { t.r=round(t.r);t.g=round(t.g);t.b=round(t.b);return t; }
	
	t.x = round(t.x)
	t.y = round(t.y)
	t.z = round(t.z)
	
	t.w = round(t.w)
	
	return t
	
}

function sn_round(t)	{
	if (t && t.r !== undefined) { t.r=round(t.r);t.g=round(t.g);t.b=round(t.b);return t; } // round the x, y, or z entries of a tuple down to 0 when < EPSILON.
	
	if (equal(t.x,0))
		t.x = 0;
	
	if (equal(t.y,0))
		t.y = 0;
	
	if (equal(t.z,0))
		t.z = 0;
	
	return t;
}

function cmp(a, b)	{
	if (a && b && a.r !== undefined && b.r !== undefined)
		return equal(a.r,b.r) && equal(a.g,b.g) && equal(a.b,b.b); // compares 2 tuples for equality
	
	if (!(a instanceof tuple) || !(b instanceof tuple))
		throw new Error("Input to math::cmp() not 2 tuples!");
		
	if(equal(a.x,b.x)&&equal(a.y,b.y)&&equal(a.z,b.z)&&(a.w==b.w))
		return true;
	
	return false;
}

function add(a, b)	{
	if (a && b && a.r !== undefined && b.r !== undefined)
		return colour(a.r + b.r, a.g + b.g, a.b + b.b);	// add 2 tuples together

	if (!(a instanceof tuple) || !(b instanceof tuple))
		throw new Error("Input to math::add() not 2 tuples!");
	
	return new tuple(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w);
}

function subtract(a, b)	{
	if (a && b && a.r !== undefined && b.r !== undefined)
		return colour(a.r - b.r, a.g - b.g, a.b - b.b);	// subtract 2 tuples, a - b

	if (!(a instanceof tuple) || !(b instanceof tuple))
		throw new Error("Input to math::subtract() not 2 tuples!");
	
	return new tuple(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
}

function multiply(a, b)	{
	if (a && b && a.r !== undefined && b.r !== undefined)
		return colour(a.r * b.r, a.g * b.g, a.b * b.b);	// multiply 2 tuples

	if (!(a instanceof tuple) || !(b instanceof tuple))
		throw new Error("Input to math::multiply() not 2 tuples!");
	
	return new tuple(a.x * b.x, a.y * b.y, a.z * b.z, a.w * b.w);
}

function multiplyInt(_tuple, int)	{
	if (_tuple && _tuple.r !== undefined)
		return colour(_tuple.r * int, _tuple.g * int, _tuple.b * int);
	
	var t = new tuple(_tuple.x, _tuple.y, _tuple.z, _tuple.w);
	
	t.x = t.x * int;
	t.y = t.y * int;
	t.z = t.z * int;
	t.w = t.w * int;
	
	return t;
}

function divide(a, b)	{
	if (a && b && a.r !== undefined && b.r !== undefined)
		return colour(a.r / b.r, a.g / b.g, a.b / b.b);	// divide 2 tuples, a / b

	if (!(a instanceof tuple) || !(b instanceof tuple))
		throw new Error("Input to math::divide() not 2 tuples!");
	
	return new tuple(a.x / b.x, a.y / b.y, a.z / b.z, a.w / b.w);
}

function negate(t)	{
	if (t && t.r !== undefined) return colour(-t.r,-t.g,-t.b);
	
	var res = new tuple(0,0,0,0);
	
	res.x = -t.x;
	res.y = -t.y;
	res.z = -t.z;
	res.w = -t.w;
	
	return res;
}

function radians(deg)	{
	
	return (deg/180) * Math.PI;
}

function deg(radians)	{
	
	return (radians / Math.PI) * 180
}