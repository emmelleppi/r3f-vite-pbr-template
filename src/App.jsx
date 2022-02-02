import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import SceneManager from './SceneManager';
import { useStore } from './store';
import { CustomMaterial } from './materials/CustomMaterial/CustomMaterial';
import { OrbitControls } from '@react-three/drei';

function Light() {
	const [light, setLight] = React.useState();

	React.useEffect(() => useStore.setState((draft) => (draft.light = light)), [light]);

	return (
		<>
			<directionalLight
				ref={setLight}
				castShadow
				intensity={1}
				position={[10, 10, 10]}
				shadow-camera-near={0.1}
				shadow-camera-far={100}
				shadow-camera-right={30}
				shadow-camera-left={-30}
				shadow-camera-top={30}
				shadow-camera-bottom={-30}
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
				shadow-bias={0.0001}
			>
				<mesh attach="target" position={[0, 0, 0]} />
			</directionalLight>
		</>
	);
}

function Scene() {
	const ref = React.useRef();

	useFrame(() => {
		ref.current.rotation.x += 0.01;
		ref.current.rotation.y += 0.01;
		ref.current.rotation.z += 0.01;
	});

	return (
		<>
			<mesh ref={ref} castShadow receiveShadow>
				<torusKnotBufferGeometry args={[1, 0.45, 128, 128]} />
				<CustomMaterial color="hotpink" normalScale={0.2} metalness={1} roughness={0.3} />
			</mesh>
			<mesh receiveShadow position={[0, 0, -5]}>
				<planeBufferGeometry args={[20, 20]} />
				<CustomMaterial color="white" metalness={0} roughness={0.3} />
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
				shadows={{ enabled: true, type: THREE.PCFShadowMap }}
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
