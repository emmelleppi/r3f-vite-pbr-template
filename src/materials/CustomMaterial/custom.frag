uniform float u_time;
uniform float u_metalness;
uniform float u_roughness;
uniform float u_clearCoat;
uniform float u_sheen;
uniform float u_clearCoatRoughness;
uniform float u_reflectance;
uniform float u_normalScale;
uniform float u_normalRepeatFactor;
uniform vec2 u_envTextureSize;

uniform vec3 u_color;
uniform vec3 u_sheenColor;
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
    float intensity = 3.0;
    float indirectIntensity = 0.8;

    float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
    vec3 blueNoise = getBlueNoise(gl_FragCoord.xy);

    float roughness = u_roughness;
    #ifdef USE_ROUGHNESS_MAP
        roughness *= texture2D(u_roughnessTexture, v_uv).r;
    #endif
    
    float metalness = u_metalness;
    #ifdef USE_METALNESS_MAP
        metalness *= texture2D(u_metalnessTexture, v_uv).r;
    #endif

    // clearcoat BRDF
    float clearCoat = u_clearCoat;
    float clearCoatPerceptualRoughness = u_clearCoatRoughness;
    clearCoatPerceptualRoughness = clamp(clearCoatPerceptualRoughness, 0.089, 1.0);
    float clearCoatRoughness = clearCoatPerceptualRoughness * clearCoatPerceptualRoughness;

    vec3 N = normalize(v_worldNormal) * faceDirection;
    vec3 L = normalize(u_lightPosition - v_worldPosition);
    vec3 L_Inv = normalize(v_worldPosition - u_lightPosition);
    vec3 V = normalize(cameraPosition - v_worldPosition);
    vec3 H = normalize(L + V);
    
    #ifdef USE_NORMAL_MAP
        vec3 normalTexture = texture2D(u_normalTexture, u_normalRepeatFactor * v_uv).rgb * 2.0 - 1.0;
        N = normalize( v_normal ) * faceDirection;
        N = perturbNormal2Arb(v_viewPosition, N, normalTexture, faceDirection, u_normalScale);
        N = inverseTransformDirection(normalMatrix * N, viewMatrix);
        roughness = normalFiltering(roughness, N);
    #endif

    float perceptiveRoughness = roughness * roughness;

    float NdV = abs(dot(N, V)) + 1e-5;
    float NdL = saturate(dot(N, L));
    float NdL_Inv = saturate(dot(N, L_Inv));
    float NdH = saturate(dot(N, H));
    float LdH = saturate(dot(L, H));
    
    vec3 color = u_color;
    vec3 baseTexture = vec3(1.0);
    vec3 base = color * baseTexture;
    vec3 ambient = base * u_ambientLight;

    float reflectance = u_reflectance;

    vec3 f0 = 0.16 * reflectance * reflectance * (1.0 - metalness) + base * metalness;
    vec3 f90 = vec3(clamp(dot(f0, vec3(50.0 * 0.33)), 0.0, 1.0));

   // vec2 dfg = PrefilteredDFG_Karis(roughness, NdV);
    vec2 dfg = texture2D(u_iblTexture, vec2(perceptiveRoughness, NdV)).xy;

    vec3 diffuseColor = (1.0 - metalness) * base;
    vec3 specularColor = f0 * dfg.x + dfg.y;

    float D = D_GGX(roughness, NdH, H);
    vec3 F = F_Schlick(LdH, f0, f90);
    float G = V_SmithGGXCorrelatedFast(NdV, NdL, perceptiveRoughness);
    
    float Dc = D_GGX(clearCoatRoughness, saturate(dot(v_worldNormal, H)), H);
    float Gc = SmithG_GGX(saturate(dot(v_worldNormal, L)), 0.25) * SmithG_GGX(saturate(dot(v_worldNormal, V)), 0.25);
    float Fc = (F_Schlick(LdH, 0.5)) * clearCoat;
    float Frc = (Dc * Gc) * Fc;

    // Specular
    vec3 Fr = (D * G) * F;

    // Diffuse
    vec3 Fd = diffuseColor * Fd_Burley(NdV, NdL, LdH, perceptiveRoughness);

    vec3 irradiance = Irradiance_SphericalHarmonics(N);
    vec3 indirectDiffuse = irradiance * Fd_Lambert();

    vec3 refl = reflect(-V, N);
    vec2 reflUv = mod(equirectUv(refl), 1.0);
    vec3 indirectSpecular = texture2D(u_envTexture, reflUv, perceptiveRoughness * 11.0).xyz;

    refl = reflect(-V, normalize(v_worldNormal) * faceDirection);
    reflUv = mod(equirectUv(refl), 1.0);
    vec3 envSpecularClearcoat = texture2D(u_envTexture, reflUv, clearCoatPerceptualRoughness * 11.0).xyz;
    indirectDiffuse  *= 1.0 - Fc;
    indirectSpecular += envSpecularClearcoat * Fc;

    vec3 sheenSpecular = u_sheen * u_sheenColor * (irradiance * IBLSheenBRDF(NdV, roughness) + 2.0 * NdL * BRDF_Sheen(NdL_Inv, NdV, NdH, roughness));
    
    indirectDiffuse *= diffuseColor;
    indirectSpecular *= specularColor;
    indirectSpecular = indirectSpecular * ( 1.0 - 0.157 * u_sheen ) + sheenSpecular;

    vec3 ibl = indirectDiffuse + indirectSpecular;
     
    vec3 energyCompensation = 1.0 + f0 * (1.0 / dfg.x - 1.0);
    Fr *= energyCompensation;

    gl_FragColor.rgb = (Fd + Fr * (1.0 - Fc)) * (1.0 - Fc) + Frc;
    gl_FragColor.rgb *= (intensity * NdL);
    #include <customShadows>
    gl_FragColor.rgb += 0.5 * clearCoat * F_Schlick(dot(v_worldNormal, V));
    gl_FragColor.rgb += ibl;
    gl_FragColor.a = 1.0;

    #include <tonemapping_fragment>
	#include <encodings_fragment>
}
