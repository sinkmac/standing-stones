// Verify the front-door rotation tie-break fix (Hermes brief, 13 Aug 2026).
// Imports the REAL selection logic from rotationLogic.ts — not a copy.
//
// The repair rule under test: among currently-eligible open-access sites, lead
// whichever has led least recently. Fresh state resolves to canon order.
import { selectLeader, type StateCandidate, type LastLedMap } from '../src/lib/server/rotationLogic.ts';

const CANON = ['ballochroy', 'drombeg'];

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

// --- 1. State 1 two-way tie: both in-window (daysUntil 0), ballochroy led more
// recently -> least-recently-led (drombeg) wins, and the reason names the tie. ---
const a: StateCandidate[] = [
	{ slug: 'ballochroy', daysUntil: 0, withinWindow: true },
	{ slug: 'drombeg', daysUntil: 0, withinWindow: true }
];
const d1 = selectLeader(a, [], { ballochroy: '2026-08-10T12:00:00Z', drombeg: null } as LastLedMap, CANON);
check('state1 tie -> least-led wins (drombeg)', d1.site === 'drombeg' && d1.state === 1, `${d1.site}, state ${d1.state}: ${d1.reason}`);
check('state1 tie reason names tie-break', /tie-break/.test(d1.reason), d1.reason);

// --- 2. State 2 two-way tie: both had a recent vigil, drombeg led earlier
// -> least-recently-led (drombeg) wins. Recency of the vigil no longer ranks. ---
const d2 = selectLeader([], ['ballochroy', 'drombeg'], { ballochroy: '2026-08-12T00:00:00Z', drombeg: '2026-08-11T00:00:00Z' } as LastLedMap, CANON);
check('state2 tie -> least-led wins (drombeg)', d2.site === 'drombeg' && d2.state === 2, `${d2.site}, state ${d2.state}: ${d2.reason}`);

// --- 3. Fresh state: no lastLed entries -> never-led tie resolves to canon
// order (ballochroy before drombeg). ---
const d3 = selectLeader([], ['ballochroy', 'drombeg'], {} as LastLedMap, CANON);
check('fresh state -> canon order (ballochroy)', d3.site === 'ballochroy' && d3.state === 2, `${d3.site}, state ${d3.state}: ${d3.reason}`);

// --- 4. State 1 clear nearest dominates lastLed: ballochroy is nearer and
// wins despite having led more recently. Distance is primary; lastLed is only
// the tie-break. ---
const b: StateCandidate[] = [
	{ slug: 'ballochroy', daysUntil: 5, withinWindow: false },
	{ slug: 'drombeg', daysUntil: 40, withinWindow: false }
];
const d4 = selectLeader(b, [], { ballochroy: '2026-08-13T00:00:00Z', drombeg: null } as LastLedMap, CANON);
check('state1 nearest dominates (ballochroy)', d4.site === 'ballochroy' && /nearest/.test(d4.reason), `${d4.site}, state ${d4.state}: ${d4.reason}`);

// --- 5. State 1 outranks state 2: only ballochroy is in the alignment window,
// drombeg only has a recent vigil -> ballochroy, state 1. ---
const c: StateCandidate[] = [{ slug: 'ballochroy', daysUntil: 12, withinWindow: false }];
const d5 = selectLeader(c, ['drombeg'], {} as LastLedMap, CANON);
check('state1 outranks state2', d5.site === 'ballochroy' && d5.state === 1, `${d5.site}, state ${d5.state}: ${d5.reason}`);

// --- 6. Nothing eligible -> Callanish fallback, state 3. ---
const d6 = selectLeader([], [], {} as LastLedMap, CANON);
check('state3 fallback (callanish)', d6.site === 'callanish' && d6.state === 3, `${d6.site}, state ${d6.state}: ${d6.reason}`);

console.log('');
console.log(failures === 0 ? 'ALL ROTATION CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);