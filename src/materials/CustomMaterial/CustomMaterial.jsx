import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import frag from './custom.frag';
import vert from './custom.vert';
import { useStore } from '@/store';

const materialKey = Math.random();

export function CustomMaterial(props) {
	const {
		color = '#ffffff',
		metalness = 0.5,
		reflectance = 0,
		roughness = 0.5,
		normalScale = 0,
		clearCoat = 0,
		clearCoatRoughness = 0,
	} = props;

	const bluenoiseTexture = useTexture('/assets/textures/bluenoise.webp');
	const iblTexture = useTexture('/assets/textures/ibl_brdf_lut.webp');

	const material = React.useMemo(() => {
		const uniforms = THREE.UniformsUtils.merge([
			{
				u_deltaTime: { value: 0 },
				u_time: { value: 0 },

				u_color: { value: new THREE.Color() },
				u_sheenColor: { value: new THREE.Color() },

				u_roughness: { value: roughness },
				u_isSuperRough: { value: false },
				u_metalness: { value: metalness },
				u_reflectance: { value: reflectance },
				u_clearCoat: { value: clearCoat },
				u_clearCoatRoughness: { value: clearCoatRoughness },
				u_sheen: { value: 0 },
				u_sheenRoughness: { value: 0 },

				u_lightDirection: { value: new THREE.Vector3() },
				u_lightPosition: { value: new THREE.Vector3() },
				u_ambientLight: { value: new THREE.Vector3(0, 0, 0) },

				u_normalTexture: { value: null },
				u_normalScale: { value: normalScale },
				u_normalRepeatFactor: { value: new THREE.Vector2(1, 1) },

				u_blueNoiseTexture: { value: null },
				u_blueNoiseTexelSize: { value: new THREE.Vector2() },

				u_iblTexture: { value: null },
				u_envTexture: { value: null },
				u_envTextureSize: { value: new THREE.Vector2() },
			},
			THREE.UniformsLib.lights,
		]);

		const mat = new THREE.ShaderMaterial({
			vertexShader: vert,
			fragmentShader: frag,
			uniforms: {
				...uniforms,
			},
			lights: true,
		});
		mat.map = new THREE.Texture();

		mat.defines.USE_ROUGHNESS_MAP = false;
		mat.defines.USE_METALNESS_MAP = false;
		mat.defines.USE_NORMAL_MAP = true;
		mat.defines.USE_ENV_MAP = true;

		return mat;
	}, [materialKey]);

	React.useEffect(() => {
		material.uniforms.u_color.value.set(color);
	}, [material, color]);

	React.useEffect(() => {
		bluenoiseTexture.wrapS = bluenoiseTexture.wrapT = THREE.RepeatWrapping;
		material.uniforms.u_blueNoiseTexture.value = bluenoiseTexture;
		material.uniforms.u_blueNoiseTexelSize.value.set(
			1 / bluenoiseTexture.image.width,
			1 / bluenoiseTexture.image.height,
		);
	}, [material, bluenoiseTexture]);

	React.useEffect(() => {
		material.uniforms.u_iblTexture.value = iblTexture;
	}, [material, iblTexture]);

	useFrame((_, dt) => {
		material.uniforms.u_deltaTime.value = dt;
		material.uniforms.u_time.value += dt;

		const { light } = useStore.getState();
		if (light) {
			material.uniforms.u_lightPosition.value.copy(light.position);
			material.uniforms.u_lightDirection.value.copy(light.position);
			material.uniforms.u_lightDirection.value.sub(light.target.position);
			material.uniforms.u_lightDirection.value.normalize();
		}
	});

	return <primitive object={material} attach="material" />;
}
