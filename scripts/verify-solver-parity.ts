// Server/client parity gate for the lunar solver.
//
// The whole point of moving src/lib/server/lunarLunistice.ts -> src/lib/lunarLunistice.ts
// is that the server loads, both API routes AND the app shell all execute the SAME
// FILE, so they cannot disagree. This gate proves that structurally and numerically:
//   1. the module is in src/lib/ (importable from client code at all);
//   2. it has no imports and no Node/browser globals, so it CAN run in a browser;
//   3. there is exactly one implementation in the repo (no leftover server copy);
//   4. the repeated-fetch sweep still yields one instant and one window from the new
//      home - the same numbers the server and the app both compute.
import { readFileSync, existsSync } from 'node:fs';
import { findNextSouthernLunistice, lunisticeLocalWindow } from '../src/lib/lunarLunistice.ts';

const PATH = new URL('../src/lib/lunarLunistice.ts', import.meta.url).pathname;
const LAT = 58.19754;
let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

console.log('--- LUNAR SOLVER: SERVER/CLIENT PARITY ---');

const src = readFileSync(PATH, 'utf8');
const code = src.split('\n').filter((l: string) => !l.trimStart().startsWith('//')).join('\n');

check('module lives in src/lib/ (client-importable)', PATH.includes('/src/lib/lunarLunistice.ts'), PATH);
check('exactly one implementation in the repo',
	!existsSync(new URL('../src/lib/server/lunarLunistice.ts', import.meta.url).pathname),
	'no src/lib/server/lunarLunistice.ts');
check('no imports (self-contained)', !/^\s*import\s/m.test(code), 'no import statements in code');
const globals = code.match(/\b(process\.|require\s*\(|node:|window\.|document\.|localStorage\.|fetch\s*\()/g);
check('no Node/browser globals', globals === null, globals ? globals.join(', ') : 'none found');

// Same sweep the server gate runs: many request instants, one event, one window.
const probes: Date[] = [];
for (const daysBefore of [1, 2, 3, 6, 9, 12])
	for (const h of [0, 4, 8, 12, 16, 20])
		for (const m of [0, 17, 43])
			probes.push(new Date(Date.UTC(2026, 7, 22 - daysBefore, h, m, 31)));

const instants = new Set<string>(), windows = new Set<string>();
for (const t of probes) {
	const r = findNextSouthernLunistice(t, LAT);
	if (!r) { instants.add('null'); continue; }
	instants.add(r.datetime.toISOString());
	windows.add(lunisticeLocalWindow(r.datetime));
}
check('one instant across all request instants (from new home)', instants.size === 1,
	`${instants.size} distinct over ${probes.length} probes: ${[...instants].join(' | ')}`);
check('one window across all request instants (from new home)', windows.size === 1,
	`${windows.size} distinct: ${[...windows].join(' | ')}`);
check('window equals the server-side reference', [...windows][0] === '~12:00-13:00', `got ${[...windows][0]}`);

// The value the app will render right now, for comparison against the live site.
const live = findNextSouthernLunistice(new Date(), LAT);
if (live) console.log(`\ncurrent install-time value (app will show this): ${live.datetime.toISOString()}  ${lunisticeLocalWindow(live.datetime)}  dec ${live.declinationDeg.toFixed(2)}`);

console.log('');
console.log(failures === 0 ? 'ALL PARITY CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);