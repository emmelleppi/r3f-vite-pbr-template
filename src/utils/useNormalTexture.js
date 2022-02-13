import React from 'react';

import { useTexture } from '@react-three/drei';
import { RepeatWrapping } from 'three';

const NORMAL_ROOT = 'https://cdn.jsdelivr.net/gh/emmelleppi/normal-maps';
const DEFAULT_NORMAL = '151_norm.JPG';

export function useNormalTexture(id = 0) {
	const [normalsList, setNormalsList] = React.useState({});
	const imageName = normalsList[id] || DEFAULT_NORMAL;
	const url = `${NORMAL_ROOT}/normals/${imageName}`;

	const normalTexture = useTexture(url);
	normalTexture.wrapS = normalTexture.wrapT = RepeatWrapping;

	React.useEffect(() => {
		fetch(`${NORMAL_ROOT}/normals_list2.json`)
			.then((response) => response.json())
			.then((data) => setNormalsList(data));
	}, [setNormalsList]);

	return normalTexture;
}
