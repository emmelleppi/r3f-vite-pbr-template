import { useCallback, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import quad from '@/glsl/quad.vert';
import copy from '@/glsl/copy.frag';

export function createRenderTarget(width, height, isRGBA, isNearest, isFloat) {
	return new THREE.WebGLRenderTarget(width, height, {
		wrapS: THREE.ClampToEdgeWrapping,
		wrapT: THREE.ClampToEdgeWrapping,
		magFilter: isNearest ? THREE.NearestFilter : THREE.LinearFilter,
		minFilter: isNearest ? THREE.NearestFilter : THREE.LinearFilter,
		format: isRGBA ? THREE.RGBAFormat : THREE.RGBFormat,
		type: isFloat ? THREE.FloatType : THREE.UnsignedByteType,
		anisotropy: 0,
		encoding: THREE.LinearEncoding,
		depthBuffer: false,
		stencilBuffer: false,
	});
}

export function useCopyMaterial() {
	const gl = useThree(({ gl }) => gl);
	const precisionPrefix = `precision ${gl.capabilities.precision} float;\n`;

	return useState(
		() =>
			new THREE.RawShaderMaterial({
				uniforms: {
					u_texture: { value: null },
				},
				vertexShader: precisionPrefix + quad,
				fragmentShader: precisionPrefix + copy,
				depthTest: false,
				depthWrite: false,
				blending: THREE.NoBlending,
			}),
	)[0];
}

export function useFboRender() {
	const gl = useThree(({ gl }) => gl);
	const scene = useState(() => new THREE.Scene())[0];
	const camera = useState(() => {
		const camera = new THREE.Camera();
		camera.position.z = 1;
		return camera;
	})[0];
	const triMesh = useState(() => {
		const triGeom = new THREE.BufferGeometry();
		triGeom.setAttribute(
			'position',
			new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 4, -1, 0, -1, 4, 0]), 3),
		);
		const triMesh = new THREE.Mesh(triGeom);
		triMesh.frustumCulled = false;
		return triMesh;
	})[0];

	const render = useCallback(
		(material, renderTarget) => {
			if (renderTarget && material) {
				triMesh.material = material;

				const currentRenderTarget = gl.getRenderTarget();
				const currentToneMapping = gl.toneMapping;

				gl.toneMapping = THREE.NoToneMapping;
				gl.setRenderTarget(renderTarget);
				gl.clear();
				gl.render(scene, camera);

				gl.toneMapping = currentToneMapping;
				gl.setRenderTarget(currentRenderTarget);
			}
		},
		[gl, triMesh, scene, camera],
	);

	useEffect(() => {
		scene.add(triMesh);
		return () => scene.remove(triMesh);
	}, [scene, triMesh]);

	return render;
}
