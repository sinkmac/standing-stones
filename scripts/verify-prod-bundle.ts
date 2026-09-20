// Production-bundle gate. Runs AFTER `vite build`.
//
// 1. The dev-only test site must not appear anywhere in the build output.
// 2. With the service-worker flag OFF (the shipping state), the output must carry
//    no service-worker registration call at all - not merely skip it at runtime.
// 3. The service worker must never precache the site's own routes or the API.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEV_SLUG = 'devtest';
const SW_ENABLED = process.env.PUBLIC_SW_ENABLED === 'true';
let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else out.push(p);
	}
	return out;
}

const OUTPUT_DIRS = ['.netlify/server', '.svelte-kit/output/client', '.netlify/functions-internal'];
const files = OUTPUT_DIRS.flatMap(d => walk(d));
console.log('--- PRODUCTION BUNDLE ---');
check('build output present', files.length > 0, `${files.length} files scanned in ${OUTPUT_DIRS.join(', ')}`);

const baddies = files.filter(f => readFileSync(f, 'utf8').includes(DEV_SLUG));
check('no dev-only site slug anywhere in the build output', baddies.length === 0,
	baddies.length ? baddies.join(', ') : `no '${DEV_SLUG}'`);

// Specific to OUR registration: the call AND our versioned SW url together.
// (A bare /serviceWorker\.register/ also matches SvelteKit's own runtime string
//  `navigator.serviceWorker.register(sanitised${opts})`, and our SW file's comment.)
const registrations = files.filter(f => {
	if (f.endsWith('/sw.js')) return false;              // the worker file itself
	if (f.includes('@sveltejs/kit')) return false;       // framework runtime string
	const src = readFileSync(f, 'utf8');
	return /serviceWorker\s*\.\s*register\s*\(/.test(src) && src.includes('/sw.js?v=');
});
if (SW_ENABLED) {
	check('our service-worker registration present (flag ON)', registrations.length > 0,
		`${registrations.length} file(s)`);
} else {
	check('NO service-worker registration in the bundle (flag OFF)', registrations.length === 0,
		registrations.length ? registrations.join(', ') : 'none');
}

// The SW itself: precache must be app-shell only.
const swPath = 'static/sw.js';
check('service worker file exists', existsSync(swPath), swPath);
if (existsSync(swPath)) {
	const sw = readFileSync(swPath, 'utf8');
	const shell = sw.match(/APP_SHELL\s*=\s*\[([^\]]*)\]/);
	const entries = shell ? shell[1] : '';
	check('SW precache is app-shell only', entries.trim().length > 0 && !/'\/(ballochroy|drombeg|maeshowe|newgrange|stonehenge|clava-cairns|callanish|api)/.test(entries),
		`APP_SHELL = [${entries.trim()}]`);
	check('SW supports the kill switch', sw.includes('/sw-kill.json'), 'sw-kill.json referenced');
	// strip comments first: the file's own comment mentions skipWaiting by name
	const swCode = sw.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n');
	check('SW never calls skipWaiting outside a kill', !/skipWaiting/.test(swCode), 'no skipWaiting in code');
}

console.log('');
console.log(failures === 0 ? 'ALL PROD-BUNDLE CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
