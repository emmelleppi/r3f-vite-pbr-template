import { useStore } from '@/store';
import { useFrame } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

import frag from './depth.frag';
import vert from './depth.vert';

const materialKey = Math.random();

export function CustomDepthMaterial(props) {
	const material = React.useMemo(() => {
		const mat = new THREE.MeshDepthMaterial();
		mat.type = 'ShaderMaterial';
		mat.uniforms = THREE.UniformsUtils.merge([
			THREE.ShaderLib.depth.uniforms,
			{
				u_lightPosition: { value: new THREE.Vector3() },
				u_color: { value: new THREE.Color('#000') },
				u_opacity: { value: 0 },
			},
		]);
		mat.vertexShader = vert;
		mat.fragmentShader = frag;
		mat.depthPacking = THREE.RGBADepthPacking;

		return mat;
	}, [materialKey]);

	useFrame(() => {
		const { light } = useStore.getState();
		if (light) {
			material.uniforms.u_lightPosition.value.copy(light.position);
		}
	});

	return <primitive object={material} attach="customDepthMaterial" />;
}
