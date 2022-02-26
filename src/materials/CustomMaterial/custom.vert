uniform float u_time;
uniform vec3 u_color;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;
varying vec3 v_viewPosition;
varying vec3 v_normal;
varying vec3 v_color;

#ifdef USE_LIQUID
	uniform float u_fillAmount;
	uniform float u_wobbleX;
	uniform float u_wobbleZ;
	varying float v_fillEdge;
	varying vec3 v_worldInnerNormal;
	varying vec3 v_innerNormal;
#endif

#include <common>

vec4 rotateAroundYInDegrees(vec4 vertex, float degrees) {
	float alpha = degrees * PI / 180.0;
	float sina = sin(alpha);
	float cosa = cos(alpha);
	mat2 m = mat2(cosa, sina, -sina, cosa);
	return vec4(vertex.yz , m * vertex.xz).xzyw ;				
}

mat4 rotationX( in float angle ) {
return mat4(	1.0,		0,			0,			0,
		0, 	cos(angle),	-sin(angle),		0,
		0, 	sin(angle),	 cos(angle),		0,
		0, 			0,			  0, 		1);
}

mat4 rotationZ( in float angle ) {
return mat4(	cos(angle),		-sin(angle),	0,	0,
		sin(angle),		cos(angle),		0,	0,
			0,				0,		1,	0,
			0,				0,		0,	1);
}

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

void main() {
	vec4 transformed = vec4(position, 1.0);
	#ifdef USE_INSTANCING
		transformed = instanceMatrix * transformed;
		v_color = instanceColor;
	#else
		v_color = u_color;
	#endif

	vec3 transformedNormal = normalMatrix * normal;
	vec4 mvPosition = modelViewMatrix * transformed;
	vec4 worldPosition = modelMatrix * transformed;

    v_uv = uv;
	v_viewPosition = -mvPosition.xyz;
	v_worldPosition = worldPosition.xyz;
	v_normal = transformedNormal;
	v_worldNormal = inverseTransformDirection(transformedNormal, viewMatrix);

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

	#ifdef USE_LIQUID
		// rotate it around XY
		vec3 worldPosX = rotateAroundYInDegrees(vec4(position, 0.0), 360.0).xyz;
		// rotate around XZ
		vec3 worldPosZ = vec3(worldPosX.y, worldPosX.z, worldPosX.x);		
		// combine rotations with worldPos, based on sine wave from script
		vec3 worldPosAdjusted = worldPosition.xyz + (worldPosX  * u_wobbleX) + (worldPosZ * u_wobbleZ); 
		// how high up the liquid is
		v_fillEdge =  worldPosAdjusted.y + u_fillAmount;
		v_innerNormal = normalMatrix * (vec4(0.0, 1.0, 0.0, 1.0) * rotationX(0.5 * u_wobbleZ) * rotationZ(-0.5 * u_wobbleX)).xyz;
		v_worldInnerNormal = inverseTransformDirection(v_innerNormal, viewMatrix);
	#endif


	gl_Position = projectionMatrix * mvPosition;
}
