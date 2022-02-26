import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useStore } from './store';
import { customUniforms } from './materials/CustomMaterial/CustomMaterial';
import { useCubeTexture, useTexture } from '@react-three/drei';
import { useControls } from 'leva';
import { LightProbeGenerator } from 'three-stdlib';
import { customDepthUniforms } from './materials/CustomDepthMaterial/CustomDepthMaterial';
import { clamp } from './utils/math';

export function useSharedLiquidUniforms(store) {
	const uniforms = React.useState(() => THREE.UniformsUtils.merge([customUniforms]))[0];
	const depthUniforms = React.useState(() => THREE.UniformsUtils.merge([customDepthUniforms]))[0];

	const bluenoiseTexture = useTexture('/assets/textures/bluenoise.webp');
	const envTexture = useCubeTexture(
		['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],
		{ path: '/assets/textures/pisa/' },
	);

	const { metalness, roughness, reflectance, directIntensity, indirectIntensity } = useControls(
		'Base',
		{
			directIntensity: { value: 1.5, min: 0, max: 4, step: 0.01 },
			indirectIntensity: { value: 2.5, min: 0, max: 4, step: 0.01 },
			roughness: { value: 1, min: 0, max: 1, step: 0.01 },
			metalness: { value: 0, min: 0, max: 1, step: 0.01 },
			reflectance: { value: 0.5, min: 0, max: 1, step: 0.01 },
		},
		{ collapsed: true, store },
	);

	const { transmission, thickness, ior } = useControls(
		'Transmission',
		{
			transmission: { value: 1, min: 0, max: 1, step: 0.01 },
			thickness: { value: 1, min: 0, max: 1, step: 0.01 },
			ior: { value: 1.2, min: 1, max: 1.5, step: 0.01 },
		},
		{ collapsed: true, store },
	);

	const { sheenColor, sheen, sheenRoughness } = useControls(
		'Sheen',
		{
			sheen: { value: 1, min: 0, max: 1, step: 0.01 },
			sheenRoughness: { value: 1, min: 0, max: 1, step: 0.01 },
			sheenColor: '#5fff00',
		},
		{ collapsed: true, store },
	);

	React.useEffect(() => {
		const sh = LightProbeGenerator.fromCubeTexture(envTexture).sh.coefficients;
		uniforms.u_shCoefficients.value = sh;
	}, [uniforms, envTexture]);

	React.useEffect(() => {
		bluenoiseTexture.wrapS = bluenoiseTexture.wrapT = THREE.RepeatWrapping;
		uniforms.u_blueNoiseTexture.value = bluenoiseTexture;
		uniforms.u_blueNoiseTexelSize.value.set(
			1 / bluenoiseTexture.image.width,
			1 / bluenoiseTexture.image.height,
		);
	}, [uniforms, bluenoiseTexture]);

	useFrame((_, dt) => {
		const { light } = useStore.getState();

		uniforms.u_deltaTime.value = dt;
		uniforms.u_time.value += dt;
		depthUniforms.u_time.value += dt;

		uniforms.u_lightPosition.value.copy(light.position);

		uniforms.u_reflectance.value = reflectance;
		uniforms.u_directIntensity.value = directIntensity;
		uniforms.u_indirectIntensity.value = indirectIntensity;
		uniforms.u_isSuperRough.value = false;
		uniforms.u_roughness.value = roughness;
		uniforms.u_metalness.value = metalness;

		uniforms.u_clearCoat.value = 0;
		uniforms.u_clearCoatRoughness.value = 0;

		uniforms.u_sheen.value = sheen;
		uniforms.u_sheenRoughness.value = sheenRoughness;
		uniforms.u_sheenColor.value.set(sheenColor);

		uniforms.u_glitter.value = 0;
		uniforms.u_glitterDensity.value = 0;
		uniforms.u_glitterColor.value.set('#000000');

		uniforms.u_normalTexture.value = null;
		uniforms.u_normalScale.value = 0;
		uniforms.u_normalRepeatFactor.value.set(1, 1);

		uniforms.u_transmission.value = transmission;
		uniforms.u_thickness.value = thickness;
		uniforms.u_ior.value = ior;

		uniforms.u_envTexture.value = envTexture;
		uniforms.u_envTextureSize.value.set(envTexture.image.width, envTexture.image.height);

		depthUniforms.u_lightPosition.value.copy(light.position);
		depthUniforms.u_opacity.value = clamp(1 - transmission + metalness + roughness, 0, 1);
	});

	return [uniforms, depthUniforms];
}
