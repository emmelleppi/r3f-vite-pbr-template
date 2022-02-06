#define MEDIUMP_FLT_MAX    65504.0
#define saturateMediump(x) min(x, MEDIUMP_FLT_MAX)

vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection, float normalScale ) {
    // Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988
    vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
    vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
    vec2 st0 = dFdx( v_uv.st );
    vec2 st1 = dFdy( v_uv.st );
    vec3 N = surf_norm; // normalized
    vec3 q1perp = cross( q1, N );
    vec3 q0perp = cross( N, q0 );
    vec3 T = q1perp * st0.x + q0perp * st1.x;
    vec3 B = q1perp * st0.y + q0perp * st1.y;
    float det = max( dot( T, T ), dot( B, B ) );
    float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );
    scale *= normalScale;
    return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );
}

float mipMapLevel(in vec2 texture_coordinate) {
    vec2  dx_vtc        = dFdx(texture_coordinate);
    vec2  dy_vtc        = dFdy(texture_coordinate);
    float delta_max_sqr = max(dot(dx_vtc, dx_vtc), dot(dy_vtc, dy_vtc));
    float mml = 0.5 * log2(delta_max_sqr);
    return max( 0.0, mml ); 
}

float normalFiltering(float roughness, const vec3 worldNormal) {
    // Kaplanyan 2016, "Stable specular highlights"
    // Tokuyoshi 2017, "Error Reduction and Simplification for Shading Anti-Aliasing"
    // Tokuyoshi and Kaplanyan 2019, "Improved Geometric Specular Antialiasing"

    // This implementation is meant for deferred rendering in the original paper but
    // we use it in forward rendering as well (as discussed in Tokuyoshi and Kaplanyan
    // 2019). The main reason is that the forward version requires an expensive transform
    // of the half vector by the tangent frame for every light. This is therefore an
    // approximation but it works well enough for our needs and provides an improvement
    // over our original implementation based on Vlachos 2015, "Advanced VR Rendering".

    vec3 du = dFdx(worldNormal);
    vec3 dv = dFdy(worldNormal);
	float _specularAntiAliasingVariance = 2.0;
	float _specularAntiAliasingThreshold = 0.01;
    float variance = _specularAntiAliasingVariance * (dot(du, du) + dot(dv, dv));

    float kernelRoughness = min(2.0 * variance, _specularAntiAliasingThreshold);
    float squareRoughness = clamp(roughness * roughness + kernelRoughness, 0.0, 1.0);

    return sqrt(squareRoughness);
}


// Fresnel - Specular F
// Schlick 1994, "An Inexpensive BRDF Model for Physically-Based Rendering"
float F_Schlick(float product, float f0, float f90) {
    return f0 + (f90 - f0) * pow(1.0 - product, 5.0);
}
vec3 F_Schlick(float product, vec3 f0, vec3 f90) {
    return f0 + (f90 - f0) * pow(1.0 - product, 5.0);
}
float F_Schlick(float product, float f0) {
    float f = pow(1.0 - product, 5.0);
    return f + f0 * (1.0 - f);
}
vec3 F_Schlick(float product, vec3 f0) {
    float f = pow(1.0 - product, 5.0);
    return f + f0 * (1.0 - f);
}
float F_Schlick(float product) {
    float m = clamp(1. - product, 0., 1.);
    return pow(m, 5.0);
}

// Geometric shadowing - Specular G
float V_SmithGGXCorrelatedFast(float NoV, float NoL, float roughness) {
    // Heitz 2014, "Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs"
    float a = roughness + 1e-5;
    float GGXV = NoL * (NoV * (1.0 - a) + a);
    float GGXL = NoV * (NoL * (1.0 - a) + a);
    return 0.5 / (GGXV + GGXL);
}

// Normal distribution functions - Specular D
float D_GGX(float linearRoughness, float NoH, const vec3 h) {
    // Walter et al. 2007, "Microfacet Models for Refraction through Rough Surfaces"
    float oneMinusNoHSquared = 1.0 - NoH * NoH;
    float a = NoH * linearRoughness;
    float k = linearRoughness / (oneMinusNoHSquared + a * a);
    float d = k * k * (1.0 / PI);
    return d;
}

// Diffuse
float Fd_Lambert() {
    return (1.0 / PI);
}

float Fd_Burley(float NoV, float NoL, float LoH, float roughness) {
    // Burley 2012, "Physically-Based Shading at Disney"
    float f90 = 0.5 + 2.0 * roughness * LoH * LoH;
    float lightScatter = F_Schlick(NoL, 1.0, f90);
    float viewScatter = F_Schlick(NoV, 1.0, f90);
    return lightScatter * viewScatter * (1.0 / PI);
}

float IBLSheenBRDF( float NdV, const in float roughness) {
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * NdV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( 0.1 + DG * RECIPROCAL_PI );
}

float D_Charlie( float roughness, float dotNH ) {
    // https://github.com/google/filament/blob/master/shaders/src/brdf.fs
	float alpha = pow2( roughness );
	// Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF"
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 ); // 2^(-14/2), so sin2h^2 > 0 in fp16
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}

float V_Neubelt( float dotNV, float dotNL ) {
    // https://github.com/google/filament/blob/master/shaders/src/brdf.fs
	// Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline for The Order: 1886"
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}

vec3 BRDF_Sheen(float dotNL, float dotNV, float dotNH, const in float sheenRoughness ) {
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return vec3( D * V );
}

float SmithG_GGX(float NdV, float alphaG) {
    float a = alphaG * alphaG;
    float b = NdV*NdV;
    return 1. / (abs(NdV) + max(sqrt(a + b - a*b), EPSILON));
}

// Kelemen visibility term
float V_Kelemen(float LoH) {
    return 0.25 / (LoH * LoH);
}


vec3 Irradiance_SphericalHarmonics(const vec3 n) {
    // Irradiance from "Ditch River" IBL (http://www.hdrlabs.com/sibl/archive.html)
    return max(
          vec3( 0.754554516862612,  0.748542953903366,  0.790921515418539)
        + vec3(-0.083856548007422,  0.092533500963210,  0.322764661032516) * (n.y)
        + vec3( 0.308152705331738,  0.366796330467391,  0.466698181299906) * (n.z)
        + vec3(-0.188884931542396, -0.277402551592231, -0.377844212327557) * (n.x)
        , 0.0);
}

vec2 PrefilteredDFG_Karis(float roughness, float NoV) {
    // Karis 2014, "Physically Based Material on Mobile"
    const vec4 c0 = vec4(-1.0, -0.0275, -0.572,  0.022);
    const vec4 c1 = vec4( 1.0,  0.0425,  1.040, -0.040);

    vec4 r = roughness * c0 + c1;
    float a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;

    return vec2(-1.04, 1.04) * a004 + r.zw;
}
