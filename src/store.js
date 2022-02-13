import create from 'zustand';
import produce from 'immer';
import * as THREE from 'three';

const immer = (config) => (set, get, api) => config((fn) => set(produce(fn)), get, api);

export const useStore = create(
	immer(() => ({
		light: null,
		canvasGeneratedNoise: null,
		envTexture: null,
	})),
);

// programmatically generated noise texture and stored in useAsstes
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = canvas.height = 1024;
const imageData = ctx.createImageData(1024, 1024);
for (let i = 0; i < imageData.data.length; i += 4) {
	imageData.data[i] = ~~(Math.random() * 256);
	imageData.data[i + 1] = ~~(Math.random() * 256);
	imageData.data[i + 2] = ~~(Math.random() * 256);
	imageData.data[i + 3] = 255;
}
ctx.putImageData(imageData, 0, 0);
const noiseTexture = new THREE.CanvasTexture(canvas);
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
noiseTexture.minFilter = THREE.NearestFilter;
noiseTexture.magFilter = THREE.NearestFilter;
noiseTexture.needsUpdate = true;
useStore.setState((draft) => (draft['canvasGeneratedNoise'] = noiseTexture));
