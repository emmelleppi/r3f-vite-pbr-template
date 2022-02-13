import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useStore } from './store';

export function Light({ spinning }) {
	const [light, setLight] = React.useState();
	const [target, setTarget] = React.useState();
	const shadowColorTarget = React.useState(
		() =>
			new THREE.WebGLRenderTarget(1024, 1024, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
			}),
	)[0];

	React.useEffect(() => useStore.setState((draft) => (draft.light = light)), [light]);

	useFrame(({ clock }) => {
		light.shadow.updateMatrices(light);
		light.shadow.camera.updateProjectionMatrix();

		const time = clock.getElapsedTime();
		if (spinning) {
			light.position.y = 2 * Math.cos(time);
			light.position.x = 2 * Math.sin(time);
			light.position.z = 2 * Math.sin(time);
		} else {
			light.position.set(1, -1, 3);
		}
	});
	return (
		<>
			<directionalLight
				ref={setLight}
				target={target}
				castShadow
				shadow-map={shadowColorTarget}
				shadow-camera-near={0.01}
				shadow-camera-far={20}
				shadow-camera-right={10}
				shadow-camera-left={-10}
				shadow-camera-top={10}
				shadow-camera-bottom={-10}
				shadow-mapSize-width={shadowColorTarget.width}
				shadow-mapSize-height={shadowColorTarget.height}
				shadow-bias={0.0001}
			>
				<mesh material-color="red">
					<sphereBufferGeometry args={[0.1, 32, 32]} />
				</mesh>
			</directionalLight>
			<mesh ref={setTarget} position={[0, 0, 0]} />
		</>
	);
}
