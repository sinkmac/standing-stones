// Field-screen gate.
//
// It MEASURES the field surfaces rather than asserting they are fine
// (Amendment 005: demonstrated, not asserted). What it covers:
//   1. The true-north maths (declination table, drift, magnetic -> true).
//   2. The field-test point's declination matches the dev site's coordinates,
//      and the dev slug never leaks into the declination module.
//   3. Field mode / night ground are DARK surfaces (no white surface, so no
//      white flash between screens), with the luminance reported per colour.
//   4. No field copy implies an observation was verified.
//   5. The observation store: client-minted stable ids, one key per entry.
//   6. The sequence round-trips (re-entry never loses state).
//   7. The whole field flow is offline: no fetch / XHR / http in the modules.
import { readFileSync } from 'node:fs';
import {
	DECLINATION_TABLE,
	declinationAt,
	declinationFor,
	fractionalYear,
	magneticToTrue,
	angleDiff
} from '../src/lib/declination.ts';
import { FIELD_PALETTE, NIGHT_PALETTE, SURFACE_KEYS, relativeLuminance, isDarkSurface } from '../src/lib/fieldPalette.ts';
import { FIELD_COPY, STEP_LABELS } from '../src/lib/fieldCopy.ts';
import { makeObservationStore, newObservationId, OBS_ENTRY_PREFIX, type StorageLike } from '../src/lib/observation.ts';
import { makeSequenceStore, defaultSequence } from '../src/lib/vigilSequence.ts';
import { devSite } from './dev-site.ts';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

function memoryStorage(): StorageLike {
	const m = new Map<string, string>();
	return {
		getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
		setItem: (k, v) => void m.set(k, v),
		removeItem: (k) => void m.delete(k)
	};
}

function stripComments(src: string): string {
	return src
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|\n)[ \t]*\/\/[^\n]*/g, '$1')
		.replace(/[ \t]\/\/[^\n]*/g, ' ');
}

const CALLANISH = { lat: 58.19754, lon: -6.74514 };

console.log('--- DECLINATION / TRUE NORTH ---');
{
	const entry = declinationFor(CALLANISH.lat, CALLANISH.lon);
	check('a measured declination exists for Callanish', entry !== null, entry ? entry.source : 'none');
	if (entry) {
		const epoch = new Date(Date.UTC(2026, 8, 20));
		const d = declinationAt(entry, epoch);
		check('Callanish declination is 2.14 deg WEST at the epoch', Math.abs(d - -2.14) < 0.02, `${d.toFixed(3)} deg east`);
		// true = magnetic + declination (east-positive) => magnetic - 2.14 here.
		const t = magneticToTrue(0, d);
		check('true bearing = magnetic - 2.14 (north reads 357.86)', Math.abs(t - 357.86) < 0.03, t.toFixed(3));
		const later = new Date(Date.UTC(2031, 8, 20));
		check('drift moves the value EAST (less negative) over time',
			declinationAt(entry, later) > d, `${declinationAt(entry, later).toFixed(3)} deg east in 2031`);
	}
	const none = declinationFor(0, 0);
	check('a position with no measured point yields null (never zero)', none === null, none ? none.source : 'null');
	check('fractionalYear is sane', Math.abs(fractionalYear(new Date(Date.UTC(2026, 0, 1))) - 2026) < 1e-6,
		fractionalYear(new Date(Date.UTC(2026, 0, 1))).toFixed(4));
	check('angleDiff wraps into (-180,180]', angleDiff(350, 10) === -20 && angleDiff(10, 350) === 20,
		`${angleDiff(350, 10)} / ${angleDiff(10, 350)}`);
}

console.log('');
console.log('--- DECLINATION TABLE vs FIELD-TEST POINT ---');
{
	const devEntry = DECLINATION_TABLE.find(
		(e) => Math.hypot(e.latitude - devSite.latitude, e.longitude - devSite.longitude) <= 0.05
	);
	check('the field-test point has a measured declination matching dev-site.ts',
		devEntry !== undefined,
		devEntry ? `${devEntry.declinationDeg} deg east, ${devEntry.source}` : 'none — the band would fall back on the test device');
	const src = readFileSync('src/lib/declination.ts', 'utf8');
	check('the declination module carries no dev-site slug (prod-bundle safety)',
		!src.includes('devtest'), src.includes('devtest') ? 'FOUND devtest' : 'clean');
}

console.log('');
console.log('--- PALLETTE: NO WHITE SURFACES ---');
{
	for (const [name, pal] of [['field', FIELD_PALETTE], ['night', NIGHT_PALETTE]] as const) {
		for (const key of SURFACE_KEYS) {
			const hex = pal[key];
			check(`${name}.${key} is a dark surface`, isDarkSurface(hex), `${hex} luminance ${relativeLuminance(hex).toFixed(4)}`);
		}
	}
}

console.log('');
console.log('--- FIELD COPY: NOTHING IMPLIES VERIFICATION ---');
{
	const FORBIDDEN = /\b(verified|verify|confirmed|confirm|authenticated|correct|proof|validated)\b/i;
	const strings: string[] = [];
	const collect = (v: unknown) => {
		if (typeof v === 'string') strings.push(v);
		else if (typeof v === 'function') strings.push(v(2));
		else if (v && typeof v === 'object') for (const x of Object.values(v)) collect(x);
	};
	collect(FIELD_COPY);
	collect(STEP_LABELS);
	const bad = strings.filter((s) => FORBIDDEN.test(s));
	check('no field copy string implies verification', bad.length === 0, bad.length ? bad.join(' | ') : `${strings.length} strings clean`);

	const COMPONENTS = [
		'src/lib/components/VigilSequence.svelte',
		'src/lib/components/OrientationBand.svelte',
		'src/lib/components/HorizonMatch.svelte',
		'src/lib/components/ObservationRecord.svelte'
	];
	const offenders: string[] = [];
	for (const f of COMPONENTS) {
		const body = stripComments(readFileSync(f, 'utf8'));
		const m = body.match(/\b(verified|verify|confirmed|confirm|authenticated|correct|proof|validated)\b/gi);
		if (m) offenders.push(`${f}: ${[...new Set(m)].join(',')}`);
	}
	check('no field component renders a verification word', offenders.length === 0, offenders.join(' | ') || 'none');
}

console.log('');
console.log('--- FIELD MODE: NO WHITE ---');
{
	const COMPONENTS = [
		'src/lib/components/VigilSequence.svelte',
		'src/lib/components/OrientationBand.svelte',
		'src/lib/components/HorizonMatch.svelte',
		'src/lib/components/ObservationRecord.svelte'
	];
	const offenders: string[] = [];
	for (const f of COMPONENTS) {
		const body = stripComments(readFileSync(f, 'utf8'));
		if (/#fff|#ffffff|\bwhite\b/i.test(body)) offenders.push(f);
	}
	check('no field component styles a white surface', offenders.length === 0, offenders.join(' | ') || 'none');
}

console.log('');
console.log('--- OBSERVATION STORE ---');
{
	const store = makeObservationStore(memoryStorage());
	const a = newObservationId();
	const b = newObservationId();
	check('client-minted ids are unique', a !== b && a.startsWith('obs_'), `${a} / ${b}`);
	store.saveObservation({
		id: a, siteSlug: 'x', alignmentType: 'lunar-lunistice-south',
		createdAtIso: new Date().toISOString(), deviceTimeLabel: '03:10',
		saw: 'no', reason: 'cloud', note: '', latitude: null, longitude: null, locationSource: 'none'
	});
	store.saveObservation({
		id: b, siteSlug: 'x', alignmentType: 'lunar-lunistice-south',
		createdAtIso: new Date().toISOString(), deviceTimeLabel: '03:20',
		saw: 'yes', reason: null, note: 'pale moon over the ridge', latitude: 56.6, longitude: -3.0, locationSource: 'device'
	});
	check('two saves survive (one key per entry, index intact)', store.countObservations() === 2, `${store.countObservations()} entries`);
	check('an entry is stored under its own id key', store.listObservations().some((o) => o.id === b),
		`entry key ${OBS_ENTRY_PREFIX}<id> present`);
}

console.log('');
console.log('--- SEQUENCE ROUND-TRIP (re-entry keeps state) ---');
{
	const mem = memoryStorage();
	const store = makeSequenceStore(mem);
	const s = defaultSequence('x');
	s.step = 'record';
	s.fieldMode = true;
	s.matchOffset = -120;
	s.saw = 'no';
	s.reason = 'late';
	s.note = 'arrived after the window';
	store.save(s);
	const back = store.load('x');
	check('a saved sequence reloads identically',
		JSON.stringify(back) === JSON.stringify(s), `step=${back.step} fieldMode=${back.fieldMode} saw=${back.saw}`);
	const junk = makeSequenceStore({
		getItem: () => '{not json', setItem: () => {}, removeItem: () => {}
	}).load('x');
	check('a corrupt sequence falls back to the default (no throw)', junk.step === 'prepare', `step=${junk.step}`);
}

console.log('');
console.log('--- OFFLINE: NO NETWORK IN THE FIELD FLOW ---');
{
	const FILES = [
		'src/lib/declination.ts',
		'src/lib/orientation.ts',
		'src/lib/observation.ts',
		'src/lib/vigilSequence.ts',
		'src/lib/fieldCopy.ts',
		'src/lib/fieldPalette.ts',
		'src/lib/components/VigilSequence.svelte',
		'src/lib/components/OrientationBand.svelte',
		'src/lib/components/HorizonMatch.svelte',
		'src/lib/components/ObservationRecord.svelte'
	];
	const offenders: string[] = [];
	for (const f of FILES) {
		const body = stripComments(readFileSync(f, 'utf8'));
		if (/\bfetch\s*\(|XMLHttpRequest|https?:\/\//.test(body)) offenders.push(f);
	}
	check('no network call anywhere in the field flow', offenders.length === 0, offenders.join(' | ') || `${FILES.length} files clean`);
}

console.log('');
console.log('--- STORAGE THAT THROWS (the Node 22 global) ---');
{
	// Node 22 exposes a localStorage global that throws without a backing file.
	// That crashed the SSR render once; the stores must survive a storage that
	// throws on every call.
	const throwing: StorageLike = {
		getItem() {
			throw new Error('no backing file');
		},
		setItem() {
			throw new Error('no backing file');
		},
		removeItem() {
			throw new Error('no backing file');
		}
	};
	let ok = true;
	let detail = '';
	try {
		const s = makeSequenceStore(throwing);
		const loaded = s.load('x');
		s.save(loaded);
		s.clear('x');
		const o = makeObservationStore(throwing);
		o.saveObservation({
			id: 'obs_x', siteSlug: 'x', alignmentType: null,
			createdAtIso: new Date().toISOString(), deviceTimeLabel: '00:00',
			saw: 'yes', reason: null, note: '', latitude: null, longitude: null, locationSource: 'none'
		});
		ok = loaded.step === 'prepare' && o.countObservations() === 0;
		detail = ok ? `load->${loaded.step}, saves swallowed, count 0` : 'wrong result from a throwing store';
	} catch (e) {
		ok = false;
		detail = `threw: ${String(e)}`;
	}
	check('a throwing storage is survived (SSR safety)', ok, detail);
}

console.log('');
console.log(failures === 0 ? 'ALL FIELD CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
