import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import SceneManager from './SceneManager';
import { useStore } from './store';
import { CustomMaterial } from './materials/CustomMaterial/CustomMaterial';
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import { Leva, useControls } from 'leva';
import { useCopyMaterial, useFboRender } from './utils/helpers';
import { CustomDepthMaterial } from './materials/CustomDepthMaterial/CustomDepthMaterial';
import { Light } from './Light';
import { useSharedUniforms } from './useSharedUniforms';

function Scene() {
	const groupRef = React.useRef();
	const refPlane = React.useRef();
	const isShadowRendering = React.useRef(false);

	const { nodes } = useGLTF('/assets/suzanne-draco.glb', true);
	const directionalLight = useStore(({ light }) => light);
	const bgTexture = useTexture('/assets/textures/cloud.png');
	const [uniforms, depthUniforms] = useSharedUniforms();

	const gl = useThree(({ gl }) => gl);
	const scene = useThree(({ scene }) => scene);
	const render = useFboRender();
	const copyMaterial = useCopyMaterial();
	const clearColor = React.useState(() => new THREE.Color())[0];
	const transmissionRenderTarget = React.useState(
		() =>
			new THREE.WebGLRenderTarget(1024, 1024, {
				generateMipmaps: true,
				type: THREE.HalfFloatType,
				minFilter: THREE.LinearMipmapLinearFilter,
				magFilter: THREE.NearestFilter,
				wrapS: THREE.ClampToEdgeWrapping,
				wrapT: THREE.ClampToEdgeWrapping,
				useRenderToTexture: gl.extensions.has('WEBGL_multisampled_render_to_texture'),
			}),
	)[0];

	const { showBgPlane, spinningLight } = useControls(
		'Sim stuff',
		{
			showBgPlane: true,
			spinningLight: false,
		},
		{ collapsed: true },
	);

	const onBeforeRender = React.useCallback(
		(gl) => {
			if (isShadowRendering.current) return;
			copyMaterial.uniforms.u_texture.value = gl.getRenderTarget().texture;
			render(copyMaterial, transmissionRenderTarget);
			groupRef.current.traverse((c) => {
				if (c.isMesh && c.customMaterial) {
					c.material.uniforms.u_transmissionSamplerMap.value =
						transmissionRenderTarget.texture;
				}
			});
		},
		[render, copyMaterial],
	);

	useFrame(({ gl }) => {
		// render the shadow color material
		groupRef.current.traverse((c) => {
			if (c.isMesh && c.customMaterial) {
				c.material = c.customDepthMaterial;
				c.renderOrder = 0;
			}
		});

		scene.background = null;
		isShadowRendering.current = true;
		refPlane.current.visible = false;

		gl.getClearColor(clearColor);
		gl.setClearColor('#ffffff', 1);
		gl.setRenderTarget(directionalLight.shadow.map);
		gl.clear();
		gl.render(scene, directionalLight.shadow.camera);
		gl.setRenderTarget(null);
		gl.setClearColor(clearColor);

		refPlane.current.visible = showBgPlane;
		isShadowRendering.current = false;
		scene.background = useStore.getState().envTexture;
		groupRef.current.traverse((c) => {
			if (c.isMesh && c.customMaterial) {
				c.material = c.customMaterial;
				c.renderOrder = 2;
			}
		});

		// background plane stuff
		refPlane.current.material = refPlane.current.customMaterial;
		refPlane.current.material.uniforms.u_baseTexture.value = bgTexture; // directionalLight.shadow.map;
		refPlane.current.material.uniforms.u_roughness.value = 1;
		refPlane.current.material.uniforms.u_metalness.value = 0;
		refPlane.current.material.uniforms.u_envTexture.value = useStore.getState().envTexture;
		refPlane.current.material.uniforms.u_envTextureSize.value.set(
			useStore.getState().envTexture.image.width,
			useStore.getState().envTexture.image.height,
		);
	});

	return (
		<>
			<mesh onBeforeRender={onBeforeRender} renderOrder={2}></mesh>
			<group ref={groupRef}>
				<mesh geometry={nodes.Suzanne.geometry} position={[1, 0, -2]}>
					<CustomMaterial color="green" uniforms={uniforms} useNormalTexture />
					<CustomDepthMaterial color="green" uniforms={depthUniforms} />
				</mesh>
				<mesh geometry={nodes.Suzanne.geometry} position-x={2}>
					<CustomMaterial color="red" uniforms={uniforms} useNormalTexture />
					<CustomDepthMaterial color="red" uniforms={depthUniforms} />
				</mesh>
			</group>
			<mesh ref={refPlane} position-z={-7}>
				<planeBufferGeometry args={[20, 20]} />
				<CustomMaterial useBaseMap />
			</mesh>
			<Light spinning={spinningLight} />
			<SceneManager />
		</>
	);
}

export function App() {
	return (
		<div id="app">
			<Canvas
				dpr={[1, 2]}
				linear
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
					fov: 50,
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

useGLTF.preload('/assets/suzanne-draco.glb');
