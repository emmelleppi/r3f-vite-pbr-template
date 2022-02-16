uniform float u_opacity;
uniform float u_rand;
uniform float u_time;
varying vec3 v_color;

#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

varying vec2 vHighPrecisionZW;
varying vec3 v_viewPosition;
varying vec3 v_normal;

float circle(vec2 _st, float _radius){
	vec2 pos = vec2(0.5)-_st;
	return 1.-smoothstep(_radius-(_radius * 10.),_radius+(_radius * 10.), dot(pos,pos));
}

float easeOutExpo(float x) {
	return saturate(1.0 - pow(2.0, -10.0 * x));
}

void main() {
	float opacity = u_opacity;
	float invOpacity = pow(1.0 - u_opacity, 2.0);

	vec3 N = normalize(v_normal);
    vec3 V = normalize(cameraPosition - v_viewPosition);
    
	float NdL = saturate(dot(N, V));
	float smoothedNdL = smoothstep(0.0, 0.5, NdL);

	#include <clipping_planes_fragment>

	vec3 diffuseColor = ((1.0 - 0.6 * invOpacity) * smoothedNdL +  0.5 * (1.0 - smoothedNdL)) * (v_color + 0.1 * invOpacity + NdL * 0.1) * invOpacity;
	diffuseColor = saturate(diffuseColor);

	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <logdepthbuf_fragment>

	// Higher precision equivalent of gl_FragCoord.z. This assumes depthRange has been left to its default values.
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;

	gl_FragColor.rgb = diffuseColor;
	gl_FragColor.rgb += invOpacity * 0.5 * circle(gl_FragCoord.xy / 1024.0, 0.0002);
	gl_FragColor.a = ( 1.0 - fragCoordZ );
}

