#include <common>
#include <uv_pars_vertex>
// This is used for computing an equivalent of gl_FragCoord.z that is as high precision as possible.
// Some platforms compute gl_FragCoord at a lower precision which makes the manually computed value better for
// depth-based postprocessing effects. Reproduced on iPad with A10 processor / iPadOS 13.3.1.
uniform vec3 u_color;

varying vec2 vHighPrecisionZW;
varying vec3 v_viewPosition;
varying vec3 v_normal;
varying vec3 v_color;

void main() {
	#include <uv_vertex>
	#include <begin_vertex>
	#include <project_vertex>

	#ifdef USE_INSTANCING
		v_color = instanceColor;
	#else
		v_color = u_color;
	#endif

	vHighPrecisionZW = gl_Position.zw;

	v_viewPosition = mvPosition.xyz;
	v_normal = normalMatrix * normal;
}