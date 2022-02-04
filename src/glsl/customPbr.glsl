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
float F_Schlick(float u, float f0, float f90) {
    return f0 + (f90 - f0) * pow(1.0 - u, 5.0);
}
vec3 F_Schlick(float u, vec3 f0, vec3 f90) {
    return f0 + (f90 - f0) * pow(1.0 - u, 5.0);
}

float F_SchlickFast(float product, float f0) {
    return mix(f0, 1.0, pow(1.0 - product, 5.0));
}
vec3 F_SchlickFast(float product, vec3 f0) {
    return mix(f0, vec3(1.0), pow(1.0 - product, 5.0));
}


// Geometric shadowing - Specular G
float V_SmithGGXCorrelatedFast(float NoV, float NoL, float roughness) {
    float a = roughness;
    float GGXV = NoL * (NoV * (1.0 - a) + a);
    float GGXL = NoV * (NoL * (1.0 - a) + a);
    return 0.5 / (GGXV + GGXL);
}

// Normal distribution functions - Specular D
float D_GGX(in float roughness, in float NdH) {
    float m = roughness * roughness;
    float m2 = m * m;
    float d = (NdH * m2 - NdH) * NdH + 1.0;
    return m2 / (PI * d * d);
}

// Diffuse
float Fd_Lambert() {
    return (1.0 / PI);
}

float Fd_Burley(float NoV, float NoL, float LoH, float roughness) {
    float f90 = 0.5 + 2.0 * roughness * LoH * LoH;
    float lightScatter = F_Schlick(NoL, 1.0, f90);
    float viewScatter = F_Schlick(NoV, 1.0, f90);
    return lightScatter * viewScatter * (1.0 / PI);
}

// Kelemen visibility term
float V_Kelemen(float LoH) {
    return 0.25 / (LoH * LoH);
}