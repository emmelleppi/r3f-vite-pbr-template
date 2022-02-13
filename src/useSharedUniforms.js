import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { useStore } from './store';
import { customUniforms } from './materials/CustomMaterial/CustomMaterial';
import { useCubeTexture, useTexture } from '@react-three/drei';
import { useControls } from 'leva';
import { LightProbeGenerator } from 'three-stdlib';
import { customDepthUniforms } from './materials/CustomDepthMaterial/CustomDepthMaterial';
import { clamp } from './utils/math';
import { useNormalTexture } from './utils/useNormalTexture';

export function useSharedUniforms() {
	const uniforms = React.useState(() => THREE.UniformsUtils.merge([customUniforms]))[0];
	const depthUniforms = React.useState(() => THREE.UniformsUtils.merge([customDepthUniforms]))[0];

	const scene = useThree(({ scene }) => scene);

	const bluenoiseTexture = useTexture('/assets/textures/bluenoise.webp');
	const canvasGeneratedNoise = useStore(({ canvasGeneratedNoise }) => canvasGeneratedNoise);
	const envTexture = useCubeTexture(
		['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],
		{ path: '/assets/textures/pisa/' },
	);

	const { metalness, roughness, reflectance, isSuperRough, directIntensity, indirectIntensity } =
		useControls(
			'Base',
			{
				directIntensity: { value: 3, min: 0, max: 4, step: 0.01 },
				indirectIntensity: { value: 0.8, min: 0, max: 4, step: 0.01 },
				roughness: { value: 0.15, min: 0, max: 1, step: 0.01 },
				metalness: { value: 0, min: 0, max: 1, step: 0.01 },
				isSuperRough: { value: true, label: 'super-rough' },
				reflectance: { value: 0.5, min: 0, max: 1, step: 0.01 },
			},
			{ collapsed: true },
		);

	const { clearCoat, clearCoatRoughness } = useControls(
		'Clearcoat',
		{
			clearCoat: { value: 0, min: 0, max: 1, step: 0.01 },
			clearCoatRoughness: { value: 0, min: 0, max: 1, step: 0.01 },
		},
		{ collapsed: true },
	);
	const { transmission, thickness, ior } = useControls(
		'Transmission',
		{
			transmission: { value: 1, min: 0, max: 1, step: 0.01 },
			thickness: { value: 1, min: 0, max: 1, step: 0.01 },
			ior: { value: 1.4, min: 1, max: 1.5, step: 0.01 },
		},
		{ collapsed: true },
	);

	const { sheenColor, sheen, sheenRoughness } = useControls(
		'Sheen',
		{
			sheen: { value: 1, min: 0, max: 1, step: 0.01 },
			sheenRoughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
			sheenColor: '#f6b6ff',
		},
		{ collapsed: true },
	);

	const { glitter, glitterDensity, glitterColor } = useControls(
		'Edward Cullen',
		{
			glitter: { value: 0, min: 0, max: 1, step: 0.01 },
			glitterDensity: { value: 4, min: 0, max: 4, step: 0.01 },
			glitterColor: { value: '#3300ff' },
		},
		{ collapsed: true },
	);

	const { normalRepeatFactor, normalScale, normalMap } = useControls(
		'Normal Map',
		{
			normalScale: { value: 0.1, min: 0, max: 1, step: 0.01 },
			normalRepeatFactor: {
				value: { x: 5, y: 5 },
				step: 0.1,
				min: 0,
				max: 10,
				joystick: 'invertY',
			},
			normalMap: { value: 49, min: 0, max: 74, step: 1 },
		},
		{ collapsed: true },
	);

	const normalTexture = useNormalTexture(normalMap);

	React.useEffect(() => {
		useStore.setState((draft) => {
			draft.envTexture = envTexture;
		});
		scene.background = envTexture;
		scene.environment = envTexture;
		const sh = LightProbeGenerator.fromCubeTexture(envTexture).sh.coefficients;
		uniforms.u_shCoefficients.value = sh;
	}, [uniforms, scene, envTexture]);

	React.useEffect(() => {
		bluenoiseTexture.wrapS = bluenoiseTexture.wrapT = THREE.RepeatWrapping;
		uniforms.u_blueNoiseTexture.value = bluenoiseTexture;
		uniforms.u_blueNoiseTexelSize.value.set(
			1 / bluenoiseTexture.image.width,
			1 / bluenoiseTexture.image.height,
		);
	}, [uniforms, bluenoiseTexture]);

	React.useEffect(() => {
		uniforms.u_glitterNoiseTexture.value = canvasGeneratedNoise;
	}, [uniforms, canvasGeneratedNoise]);

	useFrame((_, dt) => {
		const { light } = useStore.getState();

		uniforms.u_deltaTime.value = dt;
		uniforms.u_time.value += dt;

		uniforms.u_lightPosition.value.copy(light.position);

		uniforms.u_reflectance.value = reflectance;
		uniforms.u_directIntensity.value = directIntensity;
		uniforms.u_indirectIntensity.value = indirectIntensity;
		uniforms.u_isSuperRough.value = isSuperRough;
		uniforms.u_roughness.value = roughness;
		uniforms.u_metalness.value = metalness;

		uniforms.u_clearCoat.value = clearCoat;
		uniforms.u_clearCoatRoughness.value = clearCoatRoughness;

		uniforms.u_sheen.value = sheen;
		uniforms.u_sheenRoughness.value = sheenRoughness;
		uniforms.u_sheenColor.value.set(sheenColor);

		uniforms.u_glitter.value = glitter;
		uniforms.u_glitterDensity.value = glitterDensity;
		uniforms.u_glitterColor.value.set(glitterColor);

		uniforms.u_normalTexture.value = normalTexture;
		uniforms.u_normalScale.value = normalScale;
		uniforms.u_normalRepeatFactor.value.set(normalRepeatFactor.x, normalRepeatFactor.y);
		uniforms.u_transmission.value = transmission;
		uniforms.u_thickness.value = thickness;
		uniforms.u_ior.value = ior;
		uniforms.u_envTexture.value = envTexture;
		uniforms.u_envTextureSize.value.set(envTexture.image.width, envTexture.image.height);

		depthUniforms.u_lightPosition.value.copy(light.position);
		depthUniforms.u_opacity.value = clamp(
			1 - transmission + metalness + glitter + roughness,
			0,
			1,
		);
	});

	return [uniforms, depthUniforms];
}
