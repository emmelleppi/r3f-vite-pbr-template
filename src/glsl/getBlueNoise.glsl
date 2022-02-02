uniform sampler2D u_blueNoiseTexture;
uniform vec2 u_blueNoiseTexelSize;

vec3 getBlueNoise (vec2 coord) {
	return texture2D(u_blueNoiseTexture, mod(coord * u_blueNoiseTexelSize, vec2(1.0))).rgb;
}
