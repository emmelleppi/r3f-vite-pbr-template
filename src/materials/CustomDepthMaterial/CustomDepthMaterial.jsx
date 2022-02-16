import React from 'react';
import * as THREE from 'three';

import frag from './depth.frag';
import vert from './depth.vert';

const materialKey = Math.random();

export const customDepthUniforms = {
	u_lightPosition: { value: new THREE.Vector3() },
	u_opacity: { value: 0 },
	u_time: { value: 0 },
};

export function CustomDepthMaterial(props) {
	const { color = '#fff', uniforms = customDepthUniforms } = props;

	const material = React.useMemo(() => {
		const mat = new THREE.ShaderMaterial({
			uniforms: {
				...THREE.UniformsUtils.merge([THREE.ShaderLib.depth.uniforms]),
				...uniforms,
				u_color: { value: new THREE.Color('#000') },
				u_rand: { value: Math.random() },
			},
			vertexShader: vert,
			fragmentShader: frag,
		});
		mat.depthPacking = THREE.RGBADepthPacking;

		mat.blending = THREE.CustomBlending;
		mat.blendEquation = THREE.AddEquation;
		mat.blendSrc = 204;
		mat.blendDst = 202;

		return mat;
	}, [materialKey, uniforms]);

	React.useEffect(() => {
		material.uniforms.u_color.value.set(color);
	}, [material, color]);

	return <primitive object={material} attach="customDepthMaterial" />;
}

// 208-210
// 208-200
// 200-202
// 201-202
// 202-202
// 203-202 --
// 205-202 --
// 210-202 --
