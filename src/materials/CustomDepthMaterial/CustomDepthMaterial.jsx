import React from 'react';
import * as THREE from 'three';

import frag from './depth.frag';
import vert from './depth.vert';

const materialKey = Math.random();

export const customDepthUniforms = {
	u_lightPosition: { value: new THREE.Vector3() },
	u_opacity: { value: 0 },
};

export function CustomDepthMaterial(props) {
	const { color = '#fff', uniforms = customDepthUniforms } = props;
	const material = React.useMemo(() => {
		const mat = new THREE.MeshDepthMaterial();
		mat.type = 'ShaderMaterial';
		mat.uniforms = {
			...THREE.UniformsUtils.merge([THREE.ShaderLib.depth.uniforms]),
			...uniforms,
			u_color: { value: new THREE.Color('#000') },
			u_rand: { value: Math.random() },
		};
		mat.vertexShader = vert;
		mat.fragmentShader = frag;
		mat.depthPacking = THREE.RGBADepthPacking;

		mat.blending = THREE.CustomBlending;
		mat.blendEquation = THREE.AddEquation; //default
		mat.blendSrc = THREE.ZeroFactor;
		mat.blendDst = THREE.SrcColorFactor;

		return mat;
	}, [materialKey, uniforms]);

	React.useEffect(() => {
		material.uniforms.u_color.value.set(color);
	}, [material, color]);

	return <primitive object={material} attach="customDepthMaterial" />;
}
