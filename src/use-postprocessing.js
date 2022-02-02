import { useEffect, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
	EffectComposer,
	RenderPass,
	EffectPass,
	BloomEffect,
	SMAAImageLoader,
	SMAAEffect,
	OverrideMaterialManager,
	VignetteEffect,
} from 'postprocessing';

OverrideMaterialManager.workaroundEnabled = true;

const bloomResolution = 360;
const bloomKernelSize = 4;
const bloomBlurScale = 1;
const bloomIntensity = 0.9;
const bloomThreshold = 0.7;
const bloomSmoothing = 0.2;

function usePostprocessing() {
	const { gl, scene, size, camera } = useThree();
	const smaa = useLoader(SMAAImageLoader);

	const [composer, bloomEfx] = useMemo(() => {
		const composer = new EffectComposer(gl, {
			frameBufferType: THREE.HalfFloatType,
			multisampling: 0,
		});
		const renderPass = new RenderPass(scene, camera);

		const SMAA = new SMAAEffect(...smaa);
		SMAA.edgeDetectionMaterial.setEdgeDetectionThreshold(0.001);

		const BLOOM = new BloomEffect();

		const VIGNETTE = new VignetteEffect({
			eskil: true,
			offset: 0.15,
			darkness: 20,
		});

		composer.addPass(renderPass);
		composer.addPass(new EffectPass(camera, SMAA, BLOOM, VIGNETTE));

		return [composer, BLOOM, VIGNETTE];
	}, [gl, scene, camera, smaa]);

	useEffect(() => void composer.setSize(size.width, size.height), [composer, size]);
	useFrame((_, delta) => {
		composer.render(delta);

		bloomEfx.resolution.height = bloomResolution;
		bloomEfx.blurPass.kernelSize = bloomKernelSize;
		bloomEfx.blurPass.scale = bloomBlurScale;
		bloomEfx.intensity = bloomIntensity;
		bloomEfx.luminanceMaterial.threshold = bloomThreshold;
		bloomEfx.luminanceMaterial.smoothing = bloomSmoothing;
	}, 1);
}

export default usePostprocessing;
