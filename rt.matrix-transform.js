"use strict";

Array.prototype.translation = function(x, y, z)	{
	
	var m = identity_matrix();
	
	m[0][3] = x;
	m[1][3] = y;
	m[2][3] = z;
	
	return m_multiply(this, m)
}


function translation(x, y, z)	{
	
	var m = identity_matrix();
	
	m[0][3] = x;
	m[1][3] = y;
	m[2][3] = z;
	
	return m;
}

Array.prototype.scaling = function(x, y, z)	{
	
	var m = identity_matrix();
	
	m[0][0] = x;
	m[1][1] = y;
	m[2][2] = z;
	
	return m_multiply(this, m)
}

function scaling(x, y, z)	{
	
	var m = identity_matrix();
	
	m[0][0] = x;
	m[1][1] = y;
	m[2][2] = z;
	
	return m;
}

function reflect_around_axis(p, axis, scale)	{
	
	if (!scale)
		scale = 1

	if (!axis)
		axis = "x"
	
	var x = scale
	var y = scale
	var z = scale
	
	axis == "x" ? x = -x : axis == "y" ? y = -y : axis == "z" ? z = -z : x = -x ;
	
	return multiply_matrix_by_tuple(scaling(x, y, z), p)
}

Array.prototype.rotation_x = function(r, dir)	{
	
	var m = identity_matrix()
	var cos = Math.cos(r)
	var sin = Math.sin(r)
	
	m[1][1] = cos
	m[1][2] = -sin
	m[2][1] = sin
	m[2][2] = cos
	
	if (dir)
		m = inverse(m)

	return m_multiply(this, m)	
}

function rotation_x(r, dir)	{ // r is in radians units, if dir is set to 1/true, reverse direction of rotation

	var m = identity_matrix()
	var cos = Math.cos(r)
	var sin = Math.sin(r)
	
	m[1][1] = cos
	m[1][2] = -sin
	m[2][1] = sin
	m[2][2] = cos
	
	if (dir)
		m = inverse(m)

	return m // returns rotation matrix, which must be multiplied with original point to get translated/rotated co-ords
}

Array.prototype.rotation_y = function(r, dir)	{
	
	var m = identity_matrix()
	var cos = Math.cos(r)
	var sin = Math.sin(r)
	
	m[0][0] = cos
	m[0][2] = sin
	m[2][0] = -sin
	m[2][2] = cos
	
	if (dir)
		m = inverse(m)
	
	return m_multiply(this, m)
}

function rotation_y(r, dir)	{ // r is in radians units, if dir is set to 1/true, reverse direction of rotation

	var m = identity_matrix()
	var cos = Math.cos(r)
	var sin = Math.sin(r)
	
	m[0][0] = cos
	m[0][2] = sin
	m[2][0] = -sin
	m[2][2] = cos
	
	if (dir)
		m = inverse(m)
	
	return m // returns rotation matrix, which must be multiplied with original point to get translated/rotated co-ords
}

Array.prototype.rotation_z = function(r, dir)	{
	
	var m = identity_matrix()
	m[0][0] = Math.cos(r)
	m[0][1] = -Math.sin(r)
	m[1][0] = Math.sin(r)
	m[1][1] = Math.cos(r)
	
	if (dir)
		m = inverse(m)
	
	return m_multiply(this, m)	
}

function rotation_z(r, dir)	{ // r is in radians units, if dir is set to 1/true, reverse direction of rotation

	var m = identity_matrix()
	m[0][0] = Math.cos(r)
	m[0][1] = -Math.sin(r)
	m[1][0] = Math.sin(r)
	m[1][1] = Math.cos(r)
	
	if (dir)
		m = inverse(m)
	
	return m // returns rotation matrix, which must be multiplied with original point to get translated/rotated co-ords
}

function shearing(xy, xz, yx, yz, zx, zy)	{ // p53. returns shearing matrix for shearing operation
	
	var m = identity_matrix()
	
	m[0][1] = xy;	m[0][2] = xz
	m[1][0] = yx;	m[1][2] = yz
	m[2][0] = zx;	m[2][1] = zy
	
	return m
}



function multiply_matrix_by_tuple(m, t)	{
	
	var t2 = point(0,0,0)
	var prod_arr = []
	
	for (var r = 0; r < 4; r++)	{
		
		var prod = m[r][0] * t.x
		prod    += m[r][1] * t.y
		prod    += m[r][2] * t.z
		prod    += m[r][3] * t.w
		
		prod_arr.push(prod)
	}
	
	t2.x = prod_arr[0]
	t2.y = prod_arr[1]
	t2.z = prod_arr[2]
	t2.w = prod_arr[3]
	
	return t2
}

var mul = multiply_matrix_by_tuple;
