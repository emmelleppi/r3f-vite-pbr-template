
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
	float _specularAntiAliasingVariance = 10.0;
	float _specularAntiAliasingThreshold = 0.1;
    float variance = _specularAntiAliasingVariance * (dot(du, du) + dot(dv, dv));

    float kernelRoughness = min(2.0 * variance, _specularAntiAliasingThreshold);
    float squareRoughness = clamp(roughness * roughness + kernelRoughness, 0.0, 1.0);

    return sqrt(squareRoughness);
}

float DiffusePhong() {
    return (1.0 / PI);
}

vec3 DiffuseCustom(float NdL) {
    float saturatedNdL = saturate(1.0 * NdL);
    return mix(vec3(0.0), vec3(1.0), vec3(saturatedNdL));
}

vec3 FresnelFactor(vec3 f0, float product) {
    return mix(f0, vec3(1.0), pow(1.01 - product, 5.0));
}

float DBlinn(in float roughness, in float NdH) {
    float m = roughness * roughness;
    float m2 = m * m;
    float n = 2.0 / m2 - 2.0;
    return (n + 2.0) / (2.0 * PI) * pow(NdH, n);
}

float DBeckmann(in float roughness, in float NdH) {
    float m = roughness * roughness;
    float m2 = m * m;
    float NdH2 = NdH * NdH;
    return exp((NdH2 - 1.0) / (m2 * NdH2)) / (PI * m2 * NdH2 * NdH2);
}

float DGGX(in float roughness, in float NdH) {
    float m = roughness * roughness;
    float m2 = m * m;
    float d = (NdH * m2 - NdH) * NdH + 1.0;
    return m2 / (PI * d * d);
}

float GSchlick(in float roughness, in float NdV, in float NdL) {
    float k = roughness * roughness * 0.5;
    float V = NdV * (1.0 - k) + k;
    float L = NdL * (1.0 - k) + k;
    return 0.25 / (V * L);
}

vec3 SpecularPhong(in vec3 V, in vec3 L, in vec3 N, in vec3 specular, in float roughness) {
    vec3 R = reflect(-L, N);
    float spec = max(0.0, dot(V, R));

    float k = 1.999 / (roughness * roughness);

    return min(1.0, 3.0 * 0.0398 * k) * pow(spec, min(10000.0, k)) * specular;
}

vec3 SpecularBlinn(in float NdH, in vec3 specular, in float roughness) {
    float k = 1.999 / (roughness * roughness);
    
    return min(1.0, 3.0 * 0.0398 * k) * pow(NdH, min(10000.0, k)) * specular;
}

vec3 SpecularCook(in float NdL, in float NdV, in float NdH, in vec3 specular, in float roughness) {
    float D = 0.0;
    #ifdef USE_COOK_BLINN
        D = DBlinn(roughness, NdH);
    #endif
    #ifdef USE_COOK_BECKMANN
        D = DBeckmann(roughness, NdH);
    #endif
    #ifdef USE_COOK_GGX
        D = DGGX(roughness, NdH);
    #endif

    float G = GSchlick(roughness, NdV, NdL);

    float rimFactor = 1.0;
    float rim = mix(1.0 - roughness * rimFactor * 0.9, 1.0, NdV);

    return  (1.0 / rim) * specular * G * D;
}
