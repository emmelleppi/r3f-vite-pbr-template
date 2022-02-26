import { levaStoreLiquid } from '@/store';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import React from 'react';
import * as THREE from 'three';
import { clamp, lerp } from './math';

export function useLiquid(isActive) {
	const ref = React.useRef();
	const group = React.useRef();
	const wobbleAmountToAddX = React.useRef(0);
	const wobbleAmountToAddZ = React.useRef(0);

	const velocity = React.useState(() => new THREE.Vector3())[0];
	const angularVelocity = React.useState(() => new THREE.Vector3())[0];
	const lastPos = React.useState(() => new THREE.Vector3())[0];
	const lastRot = React.useState(() => new THREE.Vector3())[0];
	const worldPos = React.useState(() => new THREE.Vector3())[0];
	const _e = React.useState(() => new THREE.Euler())[0];
	const _v = React.useState(() => new THREE.Vector3())[0];
	const screenPos = React.useState(() => new THREE.Vector3())[0];

	const { fillAmount, recovery, wobbleSpeed, maxWobble } = useControls(
		'Liquid',
		{
			fillAmount: { step: 0.001, value: -0.25, min: -3, max: 3 },
			recovery: { step: 0.001, value: 10, min: 0, max: 100 },
			wobbleSpeed: { step: 0.001, value: 2, min: 0, max: 10 },
			maxWobble: { step: 0.001, value: 0.2, min: -Math.PI, max: Math.PI },
		},
		{ store: levaStoreLiquid.current },
	);

	useFrame(({ clock, camera, mouse }, dt) => {
		if (
			!(
				ref.current &&
				group.current &&
				ref.current.material.attach === 'customMaterial' &&
				isActive
			)
		)
			return;

		camera.position.set(0, 0, 5);
		camera.lookAt(0, 0, 0);
		ref.current.getWorldPosition(worldPos);
		const time = clock.getElapsedTime();

		// decrease wobble over time
		const decreasingFact = dt * recovery;
		wobbleAmountToAddX.current = lerp(wobbleAmountToAddX.current, 0, decreasingFact);
		wobbleAmountToAddZ.current = lerp(wobbleAmountToAddZ.current, 0, decreasingFact);

		// make a sine wave of the decreasing wobble
		const pulse = 2 * Math.PI * wobbleSpeed;
		const wobbleAmountX = wobbleAmountToAddX.current * Math.sin(pulse * time);
		const wobbleAmountZ = wobbleAmountToAddZ.current * Math.sin(pulse * time);

		// velocity
		if (dt > 0) {
			velocity.copy(lastPos).sub(worldPos).divideScalar(dt);
			_e.copy(ref.current.rotation);
			_v.x = _e.x;
			_v.y = _e.y;
			_v.z = _e.z;
			angularVelocity.copy(_v).sub(lastRot).divideScalar(dt);
		}
		// add clamped velocity to wobble
		wobbleAmountToAddX.current += clamp(
			(velocity.x + angularVelocity.z * 0.2) * maxWobble,
			-maxWobble,
			maxWobble,
		);
		wobbleAmountToAddZ.current += clamp(
			(velocity.z + angularVelocity.x * 0.2) * maxWobble,
			-maxWobble,
			maxWobble,
		);

		// keep last position
		lastPos.copy(worldPos);
		lastRot.copy(_v);

		// send it to the shader
		ref.current.material.uniforms.u_fillAmount.value = -worldPos.y - fillAmount;
		ref.current.material.uniforms.u_wobbleX.value = wobbleAmountX;
		ref.current.material.uniforms.u_wobbleZ.value = wobbleAmountZ;

		screenPos.set(mouse.x, mouse.y, 0);
		screenPos.unproject(camera);
		screenPos.sub(camera.position);
		screenPos.normalize();

		_v.copy(camera.position).add(screenPos.multiplyScalar(5));
		group.current.position.lerp(_v, 0.3);
	});

	return [ref, group];
}
