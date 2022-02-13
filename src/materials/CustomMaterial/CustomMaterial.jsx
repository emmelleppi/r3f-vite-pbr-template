import React from 'react';
import * as THREE from 'three';

import frag from './custom.frag';
import vert from './custom.vert';

const materialKey = Math.random();
const shCoefficients = [];
for (let i = 0; i < 9; i++) {
	shCoefficients.push(new THREE.Vector3());
}
export const customUniforms = {
	u_deltaTime: { value: 0 },
	u_time: { value: 0 },

	u_baseTexture: { value: null },
	u_reflectance: { value: 0.5 },
	u_directIntensity: { value: 2 },
	u_indirectIntensity: { value: 0.8 },

	u_isSuperRough: { value: false },
	u_roughness: { value: 0.5 },
	u_metalness: { value: 0.5 },

	u_clearCoat: { value: 0 },
	u_clearCoatRoughness: { value: 0 },

	u_sheen: { value: 0 },
	u_sheenRoughness: { value: 0 },
	u_sheenColor: { value: new THREE.Color() },

	u_ambientLight: { value: new THREE.Vector3(0, 0, 0) },
	u_lightDirection: { value: new THREE.Vector3() },
	u_lightPosition: { value: new THREE.Vector3() },

	u_glitter: { value: 0 },
	u_glitterDensity: { value: 1 },
	u_glitterColor: { value: new THREE.Color() },
	u_glitterNoiseTexture: { value: null },

	u_normalTexture: { value: null },
	u_normalScale: { value: 0 },
	u_normalRepeatFactor: { value: new THREE.Vector2(1, 1) },

	u_blueNoiseTexture: { value: null },
	u_blueNoiseTexelSize: { value: new THREE.Vector2() },

	u_envTexture: { value: null },
	u_envTextureSize: { value: new THREE.Vector2() },
	u_shCoefficients: { value: shCoefficients },

	u_transmission: { value: 0 },
	u_ior: { value: 1 },
	u_thickness: { value: 0 },
	u_transmissionSamplerSize: { value: new THREE.Vector2(1024, 1024) },
	u_transmissionSamplerMap: { value: null },
};

export function CustomMaterial(props) {
	const { color = '#ffffff', useBaseMap, useNormalTexture, uniforms = customUniforms } = props;

	const material = React.useMemo(() => {
		const mergedUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.lights]);

		const mat = new THREE.ShaderMaterial({
			vertexShader: vert,
			fragmentShader: frag,
			uniforms: {
				...mergedUniforms,
				...uniforms,
				u_color: { value: new THREE.Color('#fff') },
			},
			lights: true,
		});
		mat.map = new THREE.Texture();

		mat.defines.USE_ENV_MAP = true;
		mat.defines.USE_ROUGHNESS_MAP = false;
		mat.defines.USE_METALNESS_MAP = false;
		if (useNormalTexture) {
			mat.defines.USE_NORMAL_MAP = true;
		}
		if (useBaseMap) {
			mat.defines.USE_BASE_MAP = true;
		}

		return mat;
	}, [materialKey, useBaseMap]);

	React.useEffect(() => {
		material.uniforms.u_color.value.set(color);
	}, [material, color]);

	return <primitive object={material} attach="customMaterial" />;
}
