import { useEffect } from 'react';
import * as THREE from 'three';

import usePostprocessing from './use-postprocessing';

import getBlueNoise from '@glsl/getBlueNoise.glsl';
import customShadows from '@glsl/customShadows.glsl';
import customPbr from '@glsl/customPbr.glsl';

export default function SceneManager() {
	usePostprocessing();

	useEffect(() => {
		THREE.ShaderChunk['getBlueNoise'] = getBlueNoise;
		THREE.ShaderChunk['customShadows'] = customShadows;
		THREE.ShaderChunk['customPbr'] = customPbr;
	}, []);

	return null;
}
