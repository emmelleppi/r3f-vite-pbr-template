import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import SceneManager from './SceneManager';
import { useStore } from './store';
import { CustomMaterial } from './materials/CustomMaterial/CustomMaterial';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';

function Light() {
	const [light, setLight] = React.useState();

	const { spinningLight } = useControls({
		spinningLight: false,
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
		normalRepeatFactor,
		normalScale,
		metalness,
		roughness,
		reflectance,
		clearCoat,
		clearCoatRoughness,
	} = useControls({
		color: '#e55656',
		roughness: { value: 0, min: 0, max: 1, step: 0.01 },
		metalness: { value: 0.1, min: 0, max: 1, step: 0.01 },
		reflectance: { value: 0, min: 0, max: 1, step: 0.01 },
		clearCoat: { value: 0, min: 0, max: 1, step: 0.01 },
		clearCoatRoughness: { value: 0, min: 0, max: 1, step: 0.01 },
		normalScale: { value: 0.65, min: 0, max: 1, step: 0.01 },
		normalRepeatFactor: { value: 3, min: 0, max: 4, step: 0.01 },
	});

	useFrame(() => {
		ref.current.material.uniforms.u_metalness.value = metalness;
		ref.current.material.uniforms.u_roughness.value = roughness;
		ref.current.material.uniforms.u_normalScale.value = normalScale;
		ref.current.material.uniforms.u_normalRepeatFactor.value = normalRepeatFactor;
		ref.current.material.uniforms.u_reflectance.value = reflectance;
		ref.current.material.uniforms.u_clearCoat.value = clearCoat;
		ref.current.material.uniforms.u_clearCoatRoughness.value = clearCoatRoughness;
	});

	return (
		<>
			<mesh ref={ref} castShadow receiveShadow>
				<torusKnotBufferGeometry args={[1, 0.45, 128, 32]} />
				<CustomMaterial color={color} />
			</mesh>
			<mesh receiveShadow position={[0, 0, -5]}>
				<planeBufferGeometry args={[20, 20]} />
				<CustomMaterial color="white" />
			</mesh>
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
		</div>
	);
}
