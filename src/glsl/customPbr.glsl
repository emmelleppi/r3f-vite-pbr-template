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

// float normalFiltering(float roughness, const vec3 worldNormal) {
//     // Kaplanyan 2016, "Stable specular highlights"
//     // Tokuyoshi 2017, "Error Reduction and Simplification for Shading Anti-Aliasing"
//     // Tokuyoshi and Kaplanyan 2019, "Improved Geometric Specular Antialiasing"

//     // This implementation is meant for deferred rendering in the original paper but
//     // we use it in forward rendering as well (as discussed in Tokuyoshi and Kaplanyan
//     // 2019). The main reason is that the forward version requires an expensive transform
//     // of the half vector by the tangent frame for every light. This is therefore an
//     // approximation but it works well enough for our needs and provides an improvement
//     // over our original implementation based on Vlachos 2015, "Advanced VR Rendering".

//     vec3 du = dFdx(worldNormal);
//     vec3 dv = dFdy(worldNormal);
// 	float _specularAntiAliasingVariance = 2.0;
// 	float _specularAntiAliasingThreshold = 0.01;
//     float variance = _specularAntiAliasingVariance * (dot(du, du) + dot(dv, dv));

//     float kernelRoughness = min(2.0 * variance, _specularAntiAliasingThreshold);
//     float squareRoughness = clamp(roughness * roughness + kernelRoughness, 0.0, 1.0);

//     return sqrt(squareRoughness);
// }


// Fresnel - Specular F
// Schlick 1994, "An Inexpensive BRDF Model for Physically-Based Rendering"
float F_Schlick(float product, float f0, float f90) {
    float fresnel = exp2( ( - 5.55473 * product - 6.98316 ) * product );
    return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
vec3 F_Schlick(float product, vec3 f0, vec3 f90) {
    float fresnel = exp2( ( - 5.55473 * product - 6.98316 ) * product );
    return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick(float product, float f0) {
    float f90 = 1.0;
    float fresnel = exp2( ( - 5.55473 * product - 6.98316 ) * product );
    return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
vec3 F_Schlick(float product, vec3 f0) {
    vec3 f90 = vec3(1.0);
    float fresnel = exp2( ( - 5.55473 * product - 6.98316 ) * product );
    return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
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
// float D_GGX( const in float alpha, const in float dotNH ) {
// 	float a2 = pow2( alpha );
// 	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
// 	return RECIPROCAL_PI * a2 / pow2( denom );
// }
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
	return saturate( DG * RECIPROCAL_PI );
}

// float D_Charlie(float roughness, float NoH) {
//     // Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF"
//     float invAlpha  = 1.0 / roughness;
//     float cos2h = NoH * NoH;
//     float sin2h = max(1.0 - cos2h, 0.0078125); // 2^(-14/2), so sin2h^2 > 0 in fp16
//     return (2.0 + invAlpha) * pow(sin2h, invAlpha * 0.5) / (2.0 * PI);
// }

float D_Ashikhmin(float roughness, float NoH) {
    // Ashikhmin 2007, "Distribution-based BRDFs"
	float a2 = roughness * roughness;
	float cos2h = NoH * NoH;
	float sin2h = max(1.0 - cos2h, 0.0078125); // 2^(-14/2), so sin2h^2 > 0 in fp16
	float sin4h = sin2h * sin2h;
	float cot2 = -cos2h / (a2 * sin2h);
	return 1.0 / (PI * (4.0 * a2 + 1.0) * sin4h) * (4.0 * exp(cot2) + sin4h);
}

float V_Neubelt( float dotNV, float dotNL ) {
    // https://github.com/google/filament/blob/master/shaders/src/brdf.fs
	// Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline for The Order: 1886"
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}

float SmithG_GGX(float NdV, float alphaG) {
    float a = alphaG * alphaG;
    float b = NdV*NdV;
    return 1. / (abs(NdV) + max(sqrt(a + b - a*b), EPSILON));
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


float safeacos(const float x) {
    return acos(clamp(x, -1.0, 1.0));
}

float phase(float u) {
    return (2.0*(sqrt(1.0 - u*u) - u * acos(u))) / (3.0*PI*PI);
}

vec3 shadeLambertianSphereBRDF(float NdV, float NdL, float LdV, vec3 color) { 
    // https://developer.nvidia.com/blog/nvidia-research-an-analytic-brdf-for-materials-with-spherical-lambertian-scatterers/
    float NdV2 = NdV * NdV;
    float NdL2 = NdL * NdL;
    float S = sqrt((1.0 - NdV2) * (1.0 - NdL2));
    float cp = -((-LdV + NdV * NdL) / S);
    float phi = safeacos(cp);
    
    vec3 C = (1.0 - pow(1.0 - color, vec3(2.73556))) / (1.0 - 0.184096 * pow(1.0 - color, vec3(2.48423)));

    // Single-Scattering component, corresponds to "f_1" in the paper.
    vec3 SS = C * (phase(-LdV) / (NdV + NdL));
    
    float p = NdV * NdL;
    vec3 Fr = max( 
        vec3(0.0), 
        0.995917*SS+(0.0684744*(((phi+sqrt(p))*(-0.249978+C)/(4.50996*((safeacos(S)/S)+0.113706)))+pow(max(1.94208*color,0.0),vec3(1.85432))))
    );
    return Fr;
}


// Transmission stuff
vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
    // Direction of refracted light.
    vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );

    // Compute rotation-independant scaling of the model matrix.
    vec3 modelScale;
    modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
    modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
    modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );

    // The thickness is specified in local space.
    return normalize( refractionVector ) * thickness * modelScale;
}


vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
    float framebufferLod = log2( u_transmissionSamplerSize.x ) * roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
    return texture2D( u_transmissionSamplerMap, fragCoord.xy, framebufferLod );
}

vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
    const in vec3 position, const in mat4 modelMatrix,
    const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness ) {

    vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
    vec3 refractedRayExit = position + transmissionRay;

    // Project refracted vector on the framebuffer, while mapping to normalized device coordinates.
    vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
    vec2 refractionCoords = ndcPos.xy / ndcPos.w;
    refractionCoords += 1.0;
    refractionCoords /= 2.0;

    // Sample framebuffer to get pixel the refracted ray hits.
    vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );

    vec3 attenuatedColor = transmittedLight.rgb;

    // Get the specular component.
    vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );

    return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
}