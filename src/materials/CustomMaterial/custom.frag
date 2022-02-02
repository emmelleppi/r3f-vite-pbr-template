uniform float u_metalness;
uniform float u_roughness;
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

    float roughness = u_roughness;
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

    float NdL = max(0.0, dot(N, L));
    float NdV = max(0.001, dot(N, V));
    float NdH = max(0.001, dot(N, H));

    #ifdef USE_ENV_MAP
        vec3 envDiffuse = texture2D(u_envTexture, equirectUv(N), 10.0).xyz;
        vec3 refl = normalize(reflect(-V, N) + 0.001 * (blueNoise - 0.5)); 
        vec2 reflUv = mod(equirectUv(refl), 1.0);
        float lod = mipMapLevel(reflUv * u_envTextureSize);
        vec3 envSpecular = texture2D(u_envTexture, reflUv, max(roughness * 11.0, lod)).xyz;
    #endif

    vec3 color = u_color;
    vec3 baseTexture = vec3(1.0);
    vec3 outgoingLight = vec3(0.0);

    vec3 base = color * baseTexture;
    
    vec3 ambient = u_ambientLight;

    vec3 specular = mix(vec3(0.04), base, metalness);
    vec3 specularFresnel = FresnelFactor(specular, max(0.001, dot(N, V)));
    
    vec3 diffuseFactor = (vec3(1.0) - specularFresnel) * DiffuseCustom(NdL) * NdL;
    #ifdef USE_ENV_MAP
        diffuseFactor += envDiffuse * (1.0 / PI);
    #endif

    vec3 specularFactor = vec3(0.0);
    specularFactor = SpecularCook(NdL, NdV, NdH, specularFresnel, max(1e-3, roughness));
    specularFactor *= vec3(NdL);

    #ifdef USE_ENV_MAP
        vec2 brdf = texture2D(u_iblTexture, vec2(roughness, 1.0 - NdV)).xy;
        vec3 iblspec = min(vec3(0.99), FresnelFactor(specular, NdV) * brdf.x + brdf.y);
        specularFactor += iblspec * envSpecular;
    #endif

    outgoingLight += ambient * base;
    outgoingLight += diffuseFactor * mix(base, vec3(0.0), metalness);
    outgoingLight += specularFactor * base;

    gl_FragColor = vec4(vec3(outgoingLight), 1.0);

    #include <customShadows>
    #include <tonemapping_fragment>
	#include <encodings_fragment>
}
