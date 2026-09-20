// PWA service-worker registration — gated at BUILD time, not runtime.
//
// __SW_ENABLED__ is injected by vite.config.ts from PUBLIC_SW_ENABLED. When the
// flag is off (the default, and this phase's shipping state) the registration
// branch below is unreachable, so bundlers drop it: a production bundle carries
// NO service-worker registration call at all. scripts/verify-prod-bundle.ts
// asserts exactly that against the real build output.
//
// Turning it on is a separate, deliberate step: PUBLIC_SW_ENABLED=true npm run build

export const SW_ENABLED: boolean = __SW_ENABLED__;

export async function registerAppShellServiceWorker(buildId: string):
	Promise<'registered' | 'disabled' | 'unsupported' | 'failed'> {
	if (SW_ENABLED) {
		if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator &&
			typeof window !== 'undefined' && window.isSecureContext) {
			try {
				await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(buildId)}`, { scope: '/app' });
				return 'registered';
			} catch {
				return 'failed';
			}
		}
		return 'unsupported';
	}
	return 'disabled';
}

/** /sw-kill.json present => uninstall the worker and drop every cache, with no
 *  deploy. Safe to call unconditionally: it is a no-op when nothing is registered. */
export async function applyKillSwitchIfPresent(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
	let present = false;
	try {
		present = (await fetch('/sw-kill.json', { cache: 'no-store' })).ok;
	} catch {
		present = false;
	}
	if (!present) return false;
	const regs = await navigator.serviceWorker.getRegistrations();
	await Promise.all(regs.map(r => r.unregister()));
	if (typeof caches !== 'undefined') {
		const keys = await caches.keys();
		await Promise.all(keys.map(k => caches.delete(k)));
	}
	return true;
}
