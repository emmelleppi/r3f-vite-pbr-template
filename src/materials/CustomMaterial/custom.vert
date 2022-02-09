uniform float u_time;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;
varying vec3 v_viewPosition;
varying vec3 v_normal;

#include <common>
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
#endif

void main() {
	vec3 transformed = position;
	vec3 transformedNormal = normalMatrix * normal;

	vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0 );
	vec4 worldPosition = modelMatrix * vec4(transformed, 1.0 );

    v_uv = uv;
	v_viewPosition = mvPosition.xyz;
	v_worldPosition = worldPosition.xyz;
	v_normal = transformedNormal;
	v_worldNormal = inverseTransformDirection(transformedNormal, viewMatrix);

	#ifdef USE_SHADOWMAP
		#if NUM_DIR_LIGHT_SHADOWS > 0
			vec3 shadowWorldNormal = v_worldNormal;
			vec4 shadowWorldPosition;
			#pragma unroll_loop_start
			for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
				shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
				vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
			}
			#pragma unroll_loop_end
		#endif
	#endif
	gl_Position = projectionMatrix * mvPosition;
}
