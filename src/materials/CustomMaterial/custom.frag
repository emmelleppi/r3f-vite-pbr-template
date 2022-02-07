uniform float u_time;
uniform float u_metalness;
uniform float u_roughness;
uniform float u_clearCoat;
uniform float u_sheen;
uniform float u_clearCoatRoughness;
uniform float u_reflectance;
uniform float u_normalScale;
uniform float u_normalRepeatFactor;
uniform float u_sheenRoughness;

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
    float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
    vec3 blueNoise = getBlueNoise(gl_FragCoord.xy);

    // 
    float roughness = u_roughness;
    #ifdef USE_ROUGHNESS_MAP
        roughness *= texture2D(u_roughnessTexture, v_uv).r;
    #endif
    
    float metalness = u_metalness;
    #ifdef USE_METALNESS_MAP
        metalness *= texture2D(u_metalnessTexture, v_uv).r;
    #endif

    //
    float intensity = 1.0;
    float indirectIntensity = 1.0;
    vec3 color = u_color;
    vec3 baseTexture = vec3(1.0);
    vec3 base = color * baseTexture;
    vec3 ambient = base * u_ambientLight;
    float reflectance = u_reflectance;
    vec3 emissive = vec3(0.0);

    // 
    vec3 f0 = 0.16 * reflectance * reflectance * (1.0 - metalness) + base * metalness;
    vec3 f90 = vec3(clamp(dot(f0, vec3(50.0 * 0.33)), 0.0, 1.0));

    // 
    vec3 N = normalize(v_worldNormal) * faceDirection;
    vec3 L = normalize(u_lightPosition - v_worldPosition);
    vec3 V = normalize(cameraPosition - v_worldPosition);
    vec3 H = normalize(L + V);
    
    // calculate world normal with normalMap
    #ifdef USE_NORMAL_MAP
        vec3 normalTexture = texture2D(u_normalTexture, u_normalRepeatFactor * v_uv).rgb * 2.0 - 1.0;
        N = normalize( v_normal ) * faceDirection;
        N = perturbNormal2Arb(v_viewPosition, N, normalTexture, faceDirection, u_normalScale);
        N = inverseTransformDirection(normalMatrix * N, viewMatrix);
    #endif

    // roughness adjustment
    vec3 dxy = max(abs(dFdx(N)), abs(dFdy(N)));
    float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
    roughness = max( roughness, 0.0525 );
    roughness += geometryRoughness;
    roughness = min( roughness, 1.0 );
    float perceptualRoughness = roughness * roughness;

    // clearcoat roughness
    float clearCoat = u_clearCoat;
    float clearCoatPerceptualRoughness = u_clearCoatRoughness;
    clearCoatPerceptualRoughness = clamp(clearCoatPerceptualRoughness, 0.089, 1.0);
    float clearCoatRoughness = clearCoatPerceptualRoughness * clearCoatPerceptualRoughness;

    // sheen roughness
    float sheenRoughness = clamp(u_sheenRoughness, 0.07, 1.0);

    // 
    float NdV = abs(dot(N, V)) + 1e-5;
    float NdL = saturate(dot(N, L));
    float NdH = saturate(dot(N, H));
    float LdH = saturate(dot(L, H));
    float WNdV = abs(dot(v_worldNormal, V)) + 1e-5;
    float WNdH = saturate(dot(v_worldNormal, H));
    float WNdL = saturate(dot(v_worldNormal, L));
    
    // irradiance and radiance
    vec3 irradiance = Irradiance_SphericalHarmonics(N);
    vec3 iblIrradiance = texture2D(u_envTexture, equirectUv(N), 10.0).xyz;

    vec3 refl = reflect(-V, N);
    vec2 reflUv = equirectUv(refl);
    vec3 iblRadiance = texture2D(u_envTexture, reflUv, roughness * 11.0).xyz;

    refl = reflect(-V, normalize(v_worldNormal) * faceDirection);
    reflUv = equirectUv(refl);
    vec3 clearcoatRadiance = texture2D(u_envTexture, reflUv, clearCoatPerceptualRoughness * 11.0).xyz;

    // Diff and specular colors
    vec2 dfg = PrefilteredDFG_Karis(perceptualRoughness, NdV);
    vec3 diffuseColor = (1.0 - metalness) * base;
    vec3 specularColor = f0 * dfg.x + (1.0 - f0) * dfg.y;

    // Direct
    float nosense = 4.0;
    vec3 F = F_Schlick(LdH, f0, f90);
    float D = D_GGX(perceptualRoughness, NdH, H);
    float G = V_SmithGGXCorrelatedFast(NdV, NdL, perceptualRoughness);
    vec3 Fr = nosense * (D * G) * F;

    vec3 energyCompensation = 1.0 + f0 * (1.0 / dfg.x - 1.0);
    Fr *= energyCompensation;
        
    float Fc = F_Schlick(LdH, 0.04, 1.0) * clearCoat;
    float Dc = D_GGX(clearCoatPerceptualRoughness, WNdH, H);
    float Vc = SmithG_GGX(WNdL, 0.25) * SmithG_GGX(WNdV, 0.25);
    float Frc = nosense * (Dc * Vc) * Fc;

    float Ds = D_Ashikhmin( sheenRoughness, NdH );
    float Vs = V_Neubelt( NdV, NdL );
    float Frs = nosense * Ds * Vs;

    vec3 directDiffuse = diffuseColor * Fd_Burley(NdV, NdL, LdH, perceptualRoughness);
    vec3 directSpecular = Fr;
    vec3 clearcoatSpecular = vec3(WNdL * Frc);
    vec3 sheenSpecular = vec3(NdL * Frs);

    // Indirect
    vec3 indirectDiffuse = diffuseColor * irradiance * Fd_Lambert();

    vec2 dfgCc = PrefilteredDFG_Karis(clearCoatRoughness, WNdV);
    clearcoatSpecular += clearcoatRadiance * (0.04 * dfgCc.x + dfgCc.y);
    sheenSpecular += iblIrradiance * IBLSheenBRDF(NdV, sheenRoughness);

    vec3 FssEss = specularColor * dfg.x + dfg.y;
    float Ess = dfg.x + dfg.y;
    float Ems = 1.0 - Ess;
    vec3 Favg = specularColor + ( 1.0 - specularColor ) * 0.047619;
    vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );

    vec3 singleScattering = FssEss;
    vec3 multiScattering = Fms * Ems;
    vec3 cosineWeightedIrradiance = iblIrradiance * RECIPROCAL_PI;

    vec3 diffuse = diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );
    vec3 indirectSpecular = iblRadiance * singleScattering;
    indirectSpecular += multiScattering * cosineWeightedIrradiance;
    indirectDiffuse += diffuse * cosineWeightedIrradiance;

    float horizon = min(1.0 + dot(refl, N), 1.0);
    indirectSpecular *= horizon * horizon;

    vec3 totalDirect = directDiffuse + directSpecular;
    vec3 totalIndirect = indirectDiffuse + indirectSpecular;
    vec3 totalEmissive = emissive;


    gl_FragColor.rgb = intensity * NdL * totalDirect;

    #include <customShadows>

    gl_FragColor.rgb += indirectIntensity * totalIndirect;

    float sheenEnergyComp = 1.0 - 0.157 * max3( u_sheenColor ) * u_sheen;
    gl_FragColor.rgb = gl_FragColor.rgb * sheenEnergyComp + u_sheen * u_sheenColor * sheenSpecular;

    float Fcc = F_Schlick(WNdV, 0.04, 1.0);
    gl_FragColor.rgb = gl_FragColor.rgb * ( 1.0 - clearCoat * Fcc ) + clearcoatSpecular * clearCoat;
    
    gl_FragColor.a = 1.0;
    
    #include <tonemapping_fragment>
	#include <encodings_fragment>
    gl_FragColor = sRGBToLinear(gl_FragColor);
}




