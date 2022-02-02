import * as React from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { FloatType, EquirectangularReflectionMapping, CubeTextureLoader } from 'three';
import { RGBELoader } from 'three-stdlib';

const presetsObj = {
	sunset: 'venice_sunset_1k.hdr',
	dawn: 'kiara_1_dawn_1k.hdr',
	night: 'dikhololo_night_1k.hdr',
	warehouse: 'empty_warehouse_01_1k.hdr',
	forest: 'forest_slope_1k.hdr',
	apartment: 'lebombo_1k.hdr',
	studio: 'studio_small_03_1k.hdr',
	city: 'potsdamer_platz_1k.hdr',
	park: 'rooitou_park_1k.hdr',
	lobby: 'st_fagans_interior_1k.hdr',
};
const CUBEMAP_ROOT =
	'https://rawcdn.githack.com/pmndrs/drei-assets/aa3600359ba664d546d05821bcbca42013587df2';

export function Environment({
	background = false,
	files = ['/px.png', '/nx.png', '/py.png', '/ny.png', '/pz.png', '/nz.png'],
	path = '',
	preset = undefined,
	scene,
	extensions,
}) {
	if (preset) {
		if (!(preset in presetsObj)) {
			throw new Error('Preset must be one of: ' + Object.keys(presetsObj).join(', '));
		}
		files = presetsObj[preset];
		path = CUBEMAP_ROOT + '/hdri/';
	}
	const defaultScene = useThree(({ scene }) => scene);
	const isCubeMap = Array.isArray(files);
	const loader = isCubeMap ? CubeTextureLoader : RGBELoader;
	// @ts-expect-error
	const loaderResult = useLoader(loader, isCubeMap ? [files] : files, (loader) => {
		loader.setPath(path);
		// @ts-expect-error
		loader.setDataType?.(FloatType);
		if (extensions) extensions(loader);
	});
	const texture = isCubeMap ? loaderResult[0] : loaderResult;
	texture.mapping = EquirectangularReflectionMapping;

	React.useLayoutEffect(() => {
		texture.generateMipmaps = true;
		texture.needsUpdate = true;
		console.log(texture);
		const oldbg = scene ? scene.background : defaultScene.background;
		const oldenv = scene ? scene.environment : defaultScene.environment;
		if (scene) {
			scene.environment = texture;
			if (background) scene.background = texture;
		} else {
			defaultScene.environment = texture;
			if (background) defaultScene.background = texture;
		}
		return () => {
			if (scene) {
				scene.environment = oldenv;
				scene.background = oldbg;
			} else {
				defaultScene.environment = oldenv;
				defaultScene.background = oldbg;
			}
			// Environment textures are volatile, better dispose and uncache them
			texture.dispose();
		};
	}, [texture, background, scene]);

	return null;
}
