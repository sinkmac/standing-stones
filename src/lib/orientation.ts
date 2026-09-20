// Device heading (compass) — the browser half of the orientation band.
//
// Two honest facts drive this file:
//   1. iOS needs an explicit permission request fired from a tap. Without it,
//      there is no reading — and that must NOT read as an error, only as a
//      fallback to the drag-to-match on its own.
//   2. A phone compass is poor and reads MAGNETIC north. The band is wide for
//      that reason; the true-north correction is applied in declination.ts.
//
// Nothing here touches the network. It is a device sensor only.

export type HeadingStatus = 'idle' | 'listening' | 'denied' | 'unsupported' | 'unavailable';

export interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
	webkitCompassHeading?: number;
}

interface PermissionCapable {
	requestPermission?: () => Promise<'granted' | 'denied'>;
}

/** True when the platform exposes a heading at all. */
export function headingSupported(): boolean {
	return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

/** True when the platform demands a tap before it will give a reading (iOS 13+). */
export function needsTapPermission(): boolean {
	if (!headingSupported()) return false;
	const ctor = (window as unknown as { DeviceOrientationEvent?: PermissionCapable }).DeviceOrientationEvent;
	return typeof ctor?.requestPermission === 'function';
}

/** Ask for permission. Only meaningful after a user tap (iOS). */
export async function requestHeadingPermission(): Promise<HeadingStatus> {
	if (!headingSupported()) return 'unsupported';
	const ctor = (window as unknown as { DeviceOrientationEvent?: PermissionCapable }).DeviceOrientationEvent;
	if (typeof ctor?.requestPermission !== 'function') return 'listening';
	try {
		const res = await ctor.requestPermission();
		return res === 'granted' ? 'listening' : 'denied';
	} catch {
		return 'denied';
	}
}

function headingFromEvent(event: DeviceOrientationEvent): number | null {
	const webkit = (event as DeviceOrientationEventiOS).webkitCompassHeading;
	if (typeof webkit === 'number' && Number.isFinite(webkit)) {
		// iOS gives the compass heading directly, clockwise from magnetic north.
		return ((webkit % 360) + 360) % 360;
	}
	// The absolute orientation's alpha is a rotation about z. Devices disagree on
	// the sign; the common reading is heading = 360 - alpha. We accept this only
	// when the event claims to be absolute, and we say the band is wide because
	// of it.
	const absolute = (event as DeviceOrientationEvent & { absolute?: boolean }).absolute;
	if (absolute === true && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
		return ((360 - event.alpha) % 360 + 360) % 360;
	}
	return null;
}

/**
 * Subscribe to the device heading. Returns an unsubscribe function.
 * `onUpdate` receives a magnetic heading in degrees, or null when the sensor
 * gives no usable reading (which the caller presents as the drag-only fallback).
 * `onStatus` reports whether a reading ever arrived.
 */
export function startHeading(
	onUpdate: (magneticDeg: number | null) => void,
	onStatus: (status: HeadingStatus) => void
): () => void {
	if (!headingSupported()) {
		onStatus('unsupported');
		return () => {};
	}

	const useAbsolute =
		typeof window !== 'undefined' && 'ondeviceorientationabsolute' in window;
	const eventName = useAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';
	let gotReading = false;
	let stopped = false;

	const handler = (event: Event) => {
		const h = headingFromEvent(event as DeviceOrientationEvent);
		if (h === null) return;
		gotReading = true;
		onStatus('listening');
		onUpdate(h);
	};

	window.addEventListener(eventName, handler, true);

	// If the sensor stays silent, say so rather than spin: the drag-to-match is
	// the fallback, not an error.
	const timer = setTimeout(() => {
		if (!gotReading && !stopped) onStatus('unavailable');
	}, 1500);

	return () => {
		stopped = true;
		clearTimeout(timer);
		window.removeEventListener(eventName, handler, true);
	};
}
