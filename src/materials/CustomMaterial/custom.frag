uniform float u_time;
uniform float u_metalness;
uniform float u_roughness;
uniform float u_clearCoat;
uniform float u_clearCoatRoughness;
uniform float u_reflectance;
uniform float u_normalScale;
uniform float u_normalRepeatFactor;
uniform vec2 u_envTextureSize;

uniform vec3 u_color;
uniform vec3 u_lightPosition;
uniform vec3 u_ambientLight;

uniform sampler2D u_normalTexture;
uniform sampler2D u_roughnessTexture;
uniform sampler2D u_metalnessTexture;
uniform sampler2D u_iblTexture;
uniform sampler2D u_envTexture;

uniform mat3 normalMatrix;

varying vec2 v_uv;
varying vec3 v_viewPosition;
varying vec3 v_worldPosition;
varying vec3 v_normal;
varying vec3 v_worldNormal;

#define receiveShadow true

#include <common>
#include <packing>
#include <getBlueNoise>
#include <shadowmap_pars_fragment>
#include <customPbr>

void main() {
    float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
    vec3 blueNoise = getBlueNoise(gl_FragCoord.xy);

    float roughness = u_roughness * u_roughness;
    #ifdef USE_ROUGHNESS_MAP
        roughness *= texture2D(u_roughnessTexture, v_uv).r;
    #endif
    
    float metalness = u_metalness;
    #ifdef USE_METALNESS_MAP
        metalness *= texture2D(u_metalnessTexture, v_uv).r;
    #endif



    vec3 N = normalize(v_worldNormal) * faceDirection;
    vec3 L = normalize(u_lightPosition - v_worldPosition);
    vec3 V = normalize(cameraPosition - v_worldPosition);
    vec3 H = normalize(L + V);

    #ifdef USE_NORMAL_MAP
        vec3 normalTexture = texture2D(u_normalTexture, u_normalRepeatFactor * v_uv).rgb * 2.0 - 1.0;
        N = normalize( v_normal ) * faceDirection;
        N = perturbNormal2Arb(v_viewPosition, N, normalTexture, faceDirection, u_normalScale);
        N = inverseTransformDirection(normalMatrix * N, viewMatrix);
        roughness = normalFiltering(roughness, N);
    #endif

    float NdV = abs(dot(N, V)) + 1e-5;
    float NdL = clamp(dot(N, L), 0.0, 1.0);
    float NdH = clamp(dot(N, H), 0.0, 1.0);
    float LdH = clamp(dot(L, H), 0.0, 1.0);

    vec3 color = u_color;
    vec3 baseTexture = vec3(1.0);
    vec3 base = color * baseTexture;
    vec3 ambient = base * u_ambientLight;

    float reflectance = u_reflectance;

    vec3 f0 = 0.16 * reflectance * reflectance * (1.0 - metalness) + base * metalness;
    // vec3 f90 = vec3(clamp(dot(f0, vec3(50.0 * 0.33)), 0.0, 1.0));

    float D = D_GGX(roughness, NdH);
    vec3  F = F_SchlickFast(NdV, f0);
    float G = V_SmithGGXCorrelatedFast(NdV, NdL, roughness);

    // Specular
    vec3 Fr = D * G * F;

    // Diffuse
    vec3 Fd = vec3(Fd_Burley(NdV, NdL, LdH, roughness));
    Fd *= NdL;

    vec3 refl = reflect(-V, N);
    vec2 reflUv = mod(equirectUv(refl), 1.0);
    float lod = mipMapLevel(reflUv * u_envTextureSize);
    vec3 envSpecular = texture2D(u_envTexture, reflUv, max(roughness * 11.0, lod)).xyz;
    vec2 dfg = texture2D(u_iblTexture, vec2(roughness, 1.0 - NdV)).xy;
    vec3 iblSpecular = envSpecular * min(vec3(0.99), F * dfg.x + dfg.y);

    vec3 iblDiffuse = texture2D(u_envTexture, equirectUv(N), 10.0).xyz;
    iblDiffuse *= 1.0 / PI;

    // clear coat BRDF
    float clearCoat = u_clearCoat;
    float clearCoatPerceptualRoughness = u_clearCoatRoughness;
    clearCoatPerceptualRoughness = clamp(clearCoatPerceptualRoughness, 0.089, 1.0);
    float clearCoatRoughness = clearCoatPerceptualRoughness * clearCoatPerceptualRoughness;
    
    float Fc = F_SchlickFast(0.04, NdV) * clearCoat;
    vec3 envSpecularClearcoat = texture2D(u_envTexture, reflUv, max(clearCoatPerceptualRoughness * 11.0, lod)).xyz;
    iblSpecular *= sqrt(1.0 - Fc);
    iblSpecular += envSpecularClearcoat * Fc;
    iblDiffuse  *= 1.0 - Fc;

    vec3 energyCompensation = 1.0 + f0 * (1.0 / iblSpecular.y - 1.0);
    Fr *= energyCompensation;
    
    Fd += iblDiffuse;
    Fr += iblSpecular;

    // apply color
    vec3 diffuseColor = (1.0 - metalness) * base;
    Fd *= diffuseColor;
    vec3 specularColor = mix(vec3(0.04), base, metalness);
    Fr *= specularColor;

    gl_FragColor = vec4(vec3(Fd + Fr), 1.0);

    #include <customShadows>
    #include <tonemapping_fragment>
	#include <encodings_fragment>
}
