uniform float u_time;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;
varying vec3 v_viewPosition;
varying vec3 v_normal;

#include <common>
#include <shadowmap_pars_vertex>

void main() {
	vec3 transformed = position;
	vec3 transformedNormal = normal;

	vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0 );
	vec4 worldPosition = modelMatrix * vec4(transformed, 1.0 );

    v_uv = uv;
	v_viewPosition = mvPosition.xyz;
	v_worldPosition = worldPosition.xyz;
	v_normal = transformedNormal;
	v_worldNormal = inverseTransformDirection(normalMatrix * transformedNormal, viewMatrix);

	#include <shadowmap_vertex>

	gl_Position = projectionMatrix * mvPosition;
}
