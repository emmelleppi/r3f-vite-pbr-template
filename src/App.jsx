import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import palette from 'nice-color-palettes';

import SceneManager from './SceneManager';
import { levaStore, levaStoreLiquid, useStore } from './store';
import { Instance, Instances, OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import { LevaPanel, useControls, useCreateStore } from 'leva';
import { useCopyMaterial, useFboRender } from './utils/helpers';
import { CustomDepthMaterial } from './materials/CustomDepthMaterial/CustomDepthMaterial';
import { Light } from './Light';
import { useSharedUniforms } from './useSharedUniforms';
import mergeRefs from 'react-merge-refs';
import { useLiquid } from './utils/useLiquid';
import { CustomMaterial } from './materials/CustomMaterial/CustomMaterial';
import { useSharedLiquidUniforms } from './useSharedLiquidUniforms';
import { fit } from './utils/math';

const colors = palette[Math.floor(100 * Math.random())];

function Scene() {
	const groupRef = React.useRef();
	const refPlane = React.useRef();
	const isShadowRendering = React.useRef(false);

	const { nodes } = useGLTF('/assets/suzanne-draco.glb', true);
	const directionalLight = useStore(({ light }) => light);
	const bgTexture = useTexture('/assets/textures/cloud.png');

	const [uniforms, depthUniforms] = useSharedUniforms(levaStore.current);
	const [uniformsLiquid, uniformsLiquidDepth] = useSharedLiquidUniforms(levaStoreLiquid.current);

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

	const { color } = useControls(
		'Color',
		{
			color: '#ffffff',
		},
		{ collapsed: true, store: levaStore.current },
	);
	const { liquidColor } = useControls(
		'Color',
		{
			liquidColor: '#00ff44',
		},
		{ collapsed: true, store: levaStoreLiquid.current },
	);
	const [{ showBgPlane, spinningLight, instances, addLiquid }, set] = useControls(
		'Sim stuff',
		() => ({
			showBgPlane: false,
			spinningLight: false,
			instances: false,
			addLiquid: true,
		}),
		{ collapsed: true, store: levaStore.current },
	);

	React.useEffect(() => {
		if (addLiquid) {
			set({ instances: false });
		}
	}, [addLiquid, set]);
	React.useEffect(() => {
		if (instances) {
			set({ addLiquid: false });
		}
	}, [instances, set]);

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

	const [liquidRef, liquidGroupRef] = useLiquid(addLiquid);

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
				c.renderOrder = c.material.defines.USE_LIQUID ? 2 : 3;
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
		if (!addLiquid || instances) {
			groupRef.current.position.set(0, 0, 0);
		}
	});

	return (
		<>
			<group ref={mergeRefs([groupRef, liquidGroupRef])}>
				<Instances
					geometry={nodes.Suzanne.geometry}
					limit={10}
					range={10}
					visible={instances}
					onBeforeRender={onBeforeRender}
					renderOrder={3}
				>
					<CustomMaterial color="green" uniforms={uniforms} useNormalTexture />
					<CustomDepthMaterial color="green" uniforms={depthUniforms} />
					<Instance scale={0.75} color={colors[0]} position={[-2, 0, -2]} />
					<Instance scale={0.75} color={colors[1]} position={[-1, 0, -1]} />
					<Instance scale={0.75} color={colors[2]} position={[0, 0, 0]} />
					<Instance scale={0.75} color={colors[3]} position={[1, 0, -1]} />
					<Instance scale={0.75} color={colors[4]} position={[2, 0, -2]} />
				</Instances>
				<mesh visible={!instances} onBeforeRender={onBeforeRender} renderOrder={3}>
					{addLiquid ? (
						<octahedronBufferGeometry args={[1, 16]} />
					) : (
						<primitive attach="geometry" object={nodes.Suzanne.geometry} />
					)}
					<CustomMaterial color={color} uniforms={uniforms} useNormalTexture />
					<CustomDepthMaterial color={color} uniforms={depthUniforms} />
				</mesh>
				<mesh
					ref={liquidRef}
					visible={addLiquid}
					onBeforeRender={onBeforeRender}
					renderOrder={2}
					scale={0.97}
				>
					<octahedronBufferGeometry args={[1, 16]} />
					<CustomMaterial color={liquidColor} uniforms={uniformsLiquid} isLiquid />
					<CustomDepthMaterial color={liquidColor} uniforms={uniformsLiquidDepth} />
				</mesh>
			</group>
			<mesh ref={refPlane} position-z={-7}>
				<planeBufferGeometry args={[20, 20]} />
				<CustomMaterial useBaseMap />
			</mesh>
			<Light spinning={spinningLight} />
			<SceneManager />
			<OrbitControls enabled={!addLiquid} />
		</>
	);
}

export function App() {
	const store1 = useCreateStore();
	const store2 = useCreateStore();
	levaStore.current = store1;
	levaStoreLiquid.current = store2;

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
			</Canvas>
			<div
				style={{
					position: 'fixed',
					top: 0,
					right: 0,
					height: '100%',
					overflow: 'auto',
				}}
			>
				<LevaPanel
					fill
					store={store1}
					hideCopyButton
					titleBar={{
						drag: false,
						filter: false,
						title: 'Default',
					}}
					collapsed={true}
					theme={{ sizes: { rootWidth: '20rem' } }}
				/>
			</div>
			<div
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					height: '100%',
					overflow: 'auto',
				}}
			>
				<LevaPanel
					fill
					store={store2}
					hideCopyButton
					collapsed={true}
					titleBar={{
						drag: false,
						filter: false,
						title: 'Liquid',
					}}
					theme={{ sizes: { rootWidth: '20rem' } }}
				/>
			</div>
		</div>
	);
}

useGLTF.preload('/assets/suzanne-draco.glb');
