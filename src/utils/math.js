export function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
}

export function lerp(start, end, amt) {
	return (1 - amt) * start + amt * end;
}

export function getAngle(t, b, l, r) {
	if (t) {
		if (l) return Math.PI / 4;
		if (r) return -Math.PI / 4;
		return 0;
	}
	if (b) {
		if (l) return (Math.PI * 3) / 4;
		if (r) return (-Math.PI * 3) / 4;
		return Math.PI;
	}
	if (l) return Math.PI / 2;
	if (r) return -Math.PI / 2;
	return 0;
}

export function easeInOutCubic(x) {
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function fit(val, min, max, toMin, toMax, ease) {
	val = cUnMix(min, max, val);
	if (ease) {
		val = ease(val);
	}
	return toMin + val * (toMax - toMin);
}

export function cUnMix(min, max, val) {
	return clamp((val - min) / (max - min), 0, 1);
}
