uniform float u_time;
uniform vec3 u_color;
uniform sampler2D u_baseTexture;
uniform vec3 u_lightPosition;
uniform vec3 u_ambientLight;

uniform float u_directIntensity;
uniform float u_indirectIntensity;

uniform float u_reflectance;
uniform bool u_isSuperRough;
uniform float u_roughness;
uniform sampler2D u_roughnessTexture;
uniform float u_metalness;
uniform sampler2D u_metalnessTexture;

uniform float u_clearCoat;
uniform float u_clearCoatRoughness;

uniform float u_sheen;
uniform vec3 u_sheenColor;
uniform float u_sheenRoughness;

uniform float u_glitter;
uniform float u_glitterDensity;
uniform vec3 u_glitterColor;
uniform sampler2D u_glitterNoiseTexture;

uniform vec2 u_envTextureSize;
uniform vec2 u_normalRepeatFactor;

uniform float u_normalScale;
uniform sampler2D u_normalTexture;

uniform samplerCube u_envTexture;
uniform vec3 u_shCoefficients[ 9 ];

uniform float u_transmission;
uniform float u_thickness;
uniform float u_ior;
uniform vec2 u_transmissionSamplerSize;
uniform sampler2D u_transmissionSamplerMap;

uniform mat3 normalMatrix;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

varying vec2 v_uv;
varying vec3 v_viewPosition;
varying vec3 v_worldPosition;
varying vec3 v_normal;
varying vec3 v_worldNormal;

#define receiveShadow true

#include <common>
#include <packing>
#include <getBlueNoise>
#include <customShadows_pars>
#include <customPbr>


float blendAdd(float base, float blend) {
	return min(base+blend,1.0);
}

vec3 blendAdd(vec3 base, vec3 blend) {
	return min(base+blend,vec3(1.0));
}

vec3 blendAdd(vec3 base, vec3 blend, float opacity) {
	return (blendAdd(base, blend) * opacity + base * (1.0 - opacity));
}

void main() {
    float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
    vec3 blueNoise = getBlueNoise(gl_FragCoord.xy);


    // normal, light and view vectors
    vec3 N = normalize(v_worldNormal) * faceDirection;
    vec3 L = normalize(u_lightPosition - v_worldPosition);
    vec3 V = normalize(cameraPosition - v_worldPosition);
    vec3 H = normalize(L + V);
    

    // calculate world normal with normalMap
    #ifdef USE_NORMAL_MAP
        vec3 normalTexture = texture2D(u_normalTexture, u_normalRepeatFactor * v_uv).rgb * 2.0 - 1.0;
        N = perturbNormal2Arb(v_viewPosition, N, normalTexture, faceDirection, u_normalScale);
    #endif
    
    // applies glitter noise to the normal
    vec3 glitterNoiseTexture = texture2D(u_glitterNoiseTexture, u_glitterDensity * v_uv).rgb * 2.0 - 1.0;
    N = normalize(N + 0.5 * u_glitter * glitterNoiseTexture);

    // dot values
    float NdV = abs(dot(N, V)) + 1e-5;
    float NdL = saturate(dot(N, L));
    float NdH = saturate(dot(N, H));
    float LdH = saturate(dot(L, H));
    float LdV = saturate(dot(L, V));
    float WNdV = abs(dot(v_worldNormal, V)) + 1e-5;
    float WNdH = saturate(dot(v_worldNormal, H));
    float WNdL = saturate(dot(v_worldNormal, L));


    // reflected normals
    vec3 invertedX_N = vec3(-N.x, N.y, N.z); // dont ask me why....
    vec3 refl = reflect(-V, invertedX_N);
    vec3 Wrefl = reflect(-V, normalize(v_worldNormal) * faceDirection);


    // glitter factor
    float glitterNdH = saturate(dot(H, glitterNoiseTexture));
    float glitterNdL = saturate(dot(L, glitterNoiseTexture));
    float glitter = 0.15 * glitterNdH + 0.85 * glitterNdL;
    glitter = u_glitter * smoothstep(0.8, 0.9, glitter);


    // roughness factor
    float roughness = u_roughness;
    #ifdef USE_ROUGHNESS_MAP
        roughness *= texture2D(u_roughnessTexture, v_uv).r;
    #endif
    roughness = saturate(roughness - 0.5 * glitter);
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


    // metalness factor
    float metalness = u_metalness;
    #ifdef USE_METALNESS_MAP
        metalness *= texture2D(u_metalnessTexture, v_uv).r;
    #endif
    metalness = saturate(metalness + 0.5 * glitter);


    // colors
    vec3 color = blendAdd(u_color, u_glitterColor, glitter);
    vec3 baseTexture = vec3(1.0);
    #ifdef USE_BASE_MAP
        baseTexture = texture2D(u_baseTexture, v_uv).rgb;
    #endif
    vec3 baseColor = color * baseTexture;
    vec3 emissive = vec3(0.0);


    // diffuse and specular colors
    vec3 diffuseColor = (1.0 - metalness) * baseColor;
    vec3 specularColor = mix( vec3( 0.04 ), baseColor.rgb, metalness);


    // light
    float directIntensity = u_directIntensity;
    float indirectIntensity = u_indirectIntensity;
    vec3 ambient = baseColor * u_ambientLight;


    // reflectance
    float reflectance = u_reflectance;
    vec3 f0 = 0.16 * reflectance * reflectance * (1.0 - metalness) + baseColor * metalness;
    vec3 f90 = vec3(clamp(dot(f0, vec3(50.0 * 0.33)), 0.04, 1.0));


    // radiance
    vec3 iblRadiance = textureCube(u_envTexture, refl, roughness * 11.0).xyz;


    // clearcoat radiance
    vec3 clearcoatRadiance = textureCube(u_envTexture, Wrefl, clearCoatPerceptualRoughness * 5.0).xyz;


    // irradiance
    vec3 irradiance = shGetIrradianceAt(N, u_shCoefficients); // or vec3(1.0) + Irradiance_SphericalHarmonics(N);
    vec3 iblIrradiance = textureCube(u_envTexture, invertedX_N, 10.0).xyz;
    vec3 cosineWeightedIrradiance = iblIrradiance * RECIPROCAL_PI;

    
    // Dfg
    vec2 dfg = PrefilteredDFG_Karis(perceptualRoughness, NdV);
    vec2 dfgCc = PrefilteredDFG_Karis(clearCoatRoughness, WNdV);


    // BRDF - Direct
    vec3 Fr = vec3(0.0);
    if (u_isSuperRough) {
        Fr = shadeLambertianSphereBRDF(NdV,  NdL, LdV, baseColor);
    } else {
        vec3 F = F_Schlick(LdH, f0, f90);
        float D = D_GGX(perceptualRoughness, NdH, H);
        float G = V_SmithGGXCorrelatedFast(NdV, NdL, perceptualRoughness);
        Fr = (D * G) * F;
    }
    vec3 directDiffuse = diffuseColor * NdL * Fd_Burley(NdV, NdL, LdH, perceptualRoughness);
    vec3 directSpecular = specularColor * NdL * Fr;
        

    // Clearcoat BRDF
    float Fc = F_Schlick(LdH, 0.04, 1.0) * clearCoat;
    float Dc = D_GGX(clearCoatPerceptualRoughness, WNdH, H);
    float Vc = SmithG_GGX(WNdL, 0.25) * SmithG_GGX(WNdV, 0.25);
    float Frc = PI * (Dc * Vc) * Fc;
    vec3 clearcoatSpecular = vec3(WNdL * Frc);
    clearcoatSpecular += clearcoatRadiance * ((0.04 + mix(0.0, 0.2, clearCoatPerceptualRoughness)) * dfgCc.x + dfgCc.y);

    
    // Sheen BRDF
    float Ds = D_Ashikhmin( sheenRoughness, NdH );
    float Vs = V_Neubelt( NdV, NdL );
    float Frs = PI * Ds * Vs;
    vec3 sheenSpecular = vec3(NdL * Frs);
    sheenSpecular += iblIrradiance * IBLSheenBRDF(NdV, sheenRoughness);


    // Scattering (here I don't know exactly what is going on)
    vec3 FssEss = specularColor * dfg.x + f90 * dfg.y;
    float Ess = dfg.x + dfg.y;
    float Ems = 1.0 - Ess;
    vec3 Favg = specularColor + ( 1.0 - specularColor ) * 0.047619;
    vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
    vec3 singleScattering = FssEss;
    vec3 multiScattering = Fms * Ems;


    // Indirect
    vec3 diffuse = diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );

    vec3 indirectSpecular =  iblRadiance * singleScattering;
    indirectSpecular += multiScattering * cosineWeightedIrradiance;

    vec3 indirectDiffuse = diffuseColor * irradiance * Fd_Lambert();
    indirectDiffuse += diffuse * cosineWeightedIrradiance;


    // Horizon attenuation
    float horizon = min(1.0 + dot(Wrefl, N), 1.0);
    indirectSpecular *= horizon * horizon;


    // Total - aka putting them all together
    vec3 totalDiffuse = directIntensity * directDiffuse + indirectIntensity * indirectDiffuse;
    vec3 totalSpecular = directIntensity * directSpecular + indirectIntensity * indirectSpecular;


    // transmission - copied from threejs without any shame, simplified a bit too
    float transmissionFactor = u_transmission;
    float thicknessFactor = u_thickness;
    float ior = u_ior;
    vec3 transmission = getIBLVolumeRefraction(
        inverseTransformDirection(N, viewMatrix),
        V,
        perceptualRoughness,
        diffuseColor,
        v_worldPosition,
        modelMatrix,
        viewMatrix,
        projectionMatrix,
        ior,
        thicknessFactor,
        Fr.r * NdL
    ).rgb;
    totalDiffuse = mix( totalDiffuse, transmission, transmissionFactor );


    // Final
    gl_FragColor.rgb = totalDiffuse;
    #include <customShadows>
    gl_FragColor.rgb += totalSpecular;

    float sheenEnergyComp = 1.0 - 0.157 * max3( u_sheenColor ) * u_sheen;
    gl_FragColor.rgb = gl_FragColor.rgb * sheenEnergyComp + u_sheen * u_sheenColor * sheenSpecular;

    float Fcc = F_Schlick(WNdV, 0.04, 1.0);
    gl_FragColor.rgb = gl_FragColor.rgb * ( 1.0 - clearCoat * Fcc ) + clearcoatSpecular * clearCoat;
    
    gl_FragColor.a = 1.0;
    
    #include <tonemapping_fragment>
	#include <encodings_fragment>
}




