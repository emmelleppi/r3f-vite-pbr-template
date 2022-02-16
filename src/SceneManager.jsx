import { useEffect } from 'react';
import * as THREE from 'three';

import usePostprocessing from './usePostprocessing';

import getBlueNoise from '@glsl/getBlueNoise.glsl';
import customShadows from '@glsl/customShadows.glsl';
import customShadows_pars from '@glsl/customShadows_pars.glsl';
import customPbr from '@glsl/customPbr.glsl';

export default function SceneManager() {
	usePostprocessing();

	useEffect(() => {
		THREE.ShaderChunk['getBlueNoise'] = getBlueNoise;
		THREE.ShaderChunk['customShadows'] = customShadows;
		THREE.ShaderChunk['customShadows_pars'] = customShadows_pars;
		THREE.ShaderChunk['customPbr'] = customPbr;
	}, []);

	return null;
}
