import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import SceneManager from './SceneManager';
import { useStore } from './store';
import { CustomMaterial } from './materials/CustomMaterial/CustomMaterial';
import { OrbitControls, useNormalTexture, useTexture } from '@react-three/drei';
import { Leva, useControls } from 'leva';

function Light() {
	const [light, setLight] = React.useState();

	const { spinningLight } = useControls({
		spinningLight: true,
	});

	React.useEffect(() => useStore.setState((draft) => (draft.light = light)), [light]);

	useFrame(({ clock }) => {
		const time = clock.getElapsedTime();
		if (spinningLight) {
			light.position.y = 4 * Math.cos(time);
			light.position.x = 4 * Math.sin(time);
			light.position.z = 4 * Math.sin(time);
		} else {
			light.position.set(10, 10, 10);
		}
	});

	return (
		<>
			<directionalLight
				ref={setLight}
				castShadow
				intensity={1}
				position={[10, 10, 10]}
				shadow-camera-near={0.1}
				shadow-camera-far={50}
				shadow-camera-right={30}
				shadow-camera-left={-30}
				shadow-camera-top={30}
				shadow-camera-bottom={-30}
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
				shadow-bias={0.0001}
			>
				<mesh attach="target" position={[0, 0, 0]} />
				<mesh material-color="red">
					<sphereBufferGeometry args={[0.1, 32, 32]} />
				</mesh>
			</directionalLight>
		</>
	);
}

function Scene() {
	const ref = React.useRef();
	const {
		color,
		sheenColor,
		normalRepeatFactor,
		normalScale,
		metalness,
		roughness,
		reflectance,
		clearCoat,
		clearCoatRoughness,
		sheen,
		normalMap,
		compareWithThreejs,
		sheenRoughness,
		isSuperRough,
	} = useControls({
		color: '#d13d3d',
		sheenColor: '#33ff00',
		isSuperRough: false,
		roughness: { value: 0.7, min: 0, max: 1, step: 0.01 },
		metalness: { value: 0.15, min: 0, max: 1, step: 0.01 },
		reflectance: { value: 0.8, min: 0, max: 1, step: 0.01 },
		clearCoat: { value: 1, min: 0, max: 1, step: 0.01 },
		clearCoatRoughness: { value: 0.2, min: 0, max: 1, step: 0.01 },
		sheen: { value: 0.6, min: 0, max: 1, step: 0.01 },
		sheenRoughness: { value: 0.6, min: 0, max: 1, step: 0.01 },
		normalScale: { value: 0.8, min: 0, max: 1, step: 0.01 },
		normalRepeatFactor: { value: 1, min: 0, max: 4, step: 0.01 },
		normalMap: { value: 49, min: 0, max: 74, step: 1 },
		compareWithThreejs: false,
	});

	const [normalTexture] = useNormalTexture(normalMap);
	const envTexture = useTexture('/assets/textures/env.jpg');

	React.useEffect(() => {
		normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
		ref.current.material.uniforms.u_normalTexture.value = normalTexture;
	}, [normalTexture]);
	React.useEffect(() => {
		envTexture.mapping = THREE.EquirectangularReflectionMapping;
		ref.current.material.uniforms.u_envTexture.value = envTexture;
		ref.current.material.uniforms.u_envTextureSize.value.set(
			envTexture.image.width,
			envTexture.image.height,
		);
	}, [envTexture]);

	useFrame(({ gl }) => {
		ref.current.material.uniforms.u_color.value.set(color);
		ref.current.material.uniforms.u_sheenColor.value.set(sheenColor);
		ref.current.material.uniforms.u_metalness.value = metalness;
		ref.current.material.uniforms.u_isSuperRough.value = isSuperRough;
		ref.current.material.uniforms.u_roughness.value = roughness;
		ref.current.material.uniforms.u_normalScale.value = normalScale;
		ref.current.material.uniforms.u_normalRepeatFactor.value = normalRepeatFactor;
		ref.current.material.uniforms.u_reflectance.value = reflectance;
		ref.current.material.uniforms.u_clearCoat.value = clearCoat;
		ref.current.material.uniforms.u_clearCoatRoughness.value = clearCoatRoughness;
		ref.current.material.uniforms.u_sheen.value = sheen;
		ref.current.material.uniforms.u_sheenRoughness.value = sheenRoughness;
	});

	return (
		<>
			<mesh ref={ref} castShadow receiveShadow position-x={compareWithThreejs ? -2 : 0}>
				<torusKnotBufferGeometry args={[1, 0.45, 128, 32]} />
				<CustomMaterial />
			</mesh>
			{compareWithThreejs && (
				<mesh castShadow receiveShadow position-x={2}>
					<torusKnotBufferGeometry args={[1, 0.45, 128, 32]} />
					<meshPhysicalMaterial
						color={color}
						metalness={metalness}
						roughness={roughness}
						clearcoat={clearCoat}
						clearcoatRoughness={clearCoatRoughness}
						sheen={sheen}
						sheenRoughness={sheenRoughness}
						sheenColor={sheenColor}
						reflectivity={reflectance}
						normalMap={normalTexture}
						normalScale={normalScale}
						envMap={envTexture}
					/>
				</mesh>
			)}
			<Light />
			<SceneManager />
		</>
	);
}

export function App() {
	return (
		<div id="app">
			<Canvas
				dpr={[1, 2]}
				shadows={{ enabled: true, cookType: THREE.PCFShadowMap }}
				gl={{
					powerPreference: 'high-performance',
					antialias: false,
					stencil: false,
					depth: false,
				}}
				camera={{
					position: [0, 0, 5],
					near: 0.1,
					far: 100,
					fov: 70,
				}}
			>
				<color args={['black']} attach="background" />
				<React.Suspense fallback={null}>
					<Scene />
				</React.Suspense>
				<OrbitControls />
			</Canvas>
			<Leva hideCopyButton theme={{ sizes: { rootWidth: '20rem' } }} />
		</div>
	);
}
