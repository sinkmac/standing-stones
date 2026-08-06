// Verify the solar-solver fixes for Defect 1 (12h noon bug + 180° azimuth flip)
// in alignments.ts. Imports the REAL module — not a copy.
//
// Reference values are published astronomical facts:
//   - Summer solstice 2027 occurs ~2027-06-21T02:10 UTC (not June 20 noon).
//   - Ballochroy (55.71N, -5.61E) midsummer sunset ~21:40 BST = ~20:40 UTC.
//   - Winter solstice 2027 ~2027-12-21 (northern hemisphere).
//   - At 55.7N midsummer the sun azimuth ranges NE (~rise) -> south (noon) ->
//     NW (~set). A sunset reported ~NE, or an azimuth that runs N->E across
//     the day, is physically impossible.
import {
	getSeasons,
	getSunriseSunset,
	getSunAzimuth,
	calculateNextAlignment
} from '../src/lib/server/alignments.ts';

const LAT = 55.71195, LON = -5.61396; // Ballochroy

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

// 1. Solstice dates are plausible (real 2027 jun solstice ~June 21).
const seasons = getSeasons(2027);
const junStr = seasons.junSolstice.toISOString().slice(0, 10);
check('jun solstice ~June 21 2027', junStr >= '2027-06-20' && junStr <= '2027-06-22', `got ${junStr}`);

// 2. Ballochroy midsummer sunset is ~20:40 UTC (21:40 BST), not 09:08.
// Measure via getSunriseSunset on the solstice (as the solver does internally),
// NOT ev.solsticeDate (which is just the solstice date).
const bSS = getSunriseSunset(seasons.junSolstice, LAT, LON, 'sunset');
if (!bSS) {
	check('ballochroy sunset time', false, 'getSunriseSunset returned null');
} else {
	const utcH = bSS.time.getUTCHours() + bSS.time.getUTCMinutes() / 60;
	const plausible = utcH >= 19 && utcH <= 22; // 19:00-22:00 UTC = 20:00-23:00 BST
	check('ballochroy sunset ~20:40 UTC', plausible, `got ${bSS.time.toISOString()}`);
}

// 2b. The windowDescription text (what ships to the dossier) must be plausible:
// a sunset window that names a ~20:xx/21:xx time, not 09:xx.
const now = new Date('2026-08-06T12:00:00Z');
const ev = calculateNextAlignment(LAT, LON, 235, 'sunset', 'summer-solstice', 'surveyed', now);
check('windowDescription has plausible time',
	ev !== null && /(20|21|22):\d\d/.test(ev.eventTime),
	ev ? `eventTime=${ev.eventTime}` : 'null');

// 3. Azimuth sanity: midsummer sunset must be NW (280-330), not NE/E/S.
const ss = getSunriseSunset(seasons.junSolstice, LAT, LON, 'sunset');
if (!ss) {
	check('ballochroy sunset azimuth', false, 'getSunriseSunset returned null');
} else {
	const az = ss.azimuth;
	const plausibleAz = az >= 270 && az <= 340; // NW sector
	check('ballochroy sunset az NW (~300)', plausibleAz, `got ${az.toFixed(1)}`);
}

// 4. Azimuth sweep across the day is physically ordered: sunrise NE -> south
// at noon -> sunset NW. The OLD bug produced N->E->SE (impossible).
// June 21 2027, Ballochroy: az at 04:00 (~rise, NE), 12:00 (~south), 21:00 (~set, NW).
const morning = getSunAzimuth(new Date(Date.UTC(2027, 5, 21, 4, 0, 0)), LAT, LON);
const noon = getSunAzimuth(new Date(Date.UTC(2027, 5, 21, 12, 0, 0)), LAT, LON);
const evening = getSunAzimuth(new Date(Date.UTC(2027, 5, 21, 21, 0, 0)), LAT, LON);
check('morning az NE (40-120)', morning >= 30 && morning <= 130, `got ${morning.toFixed(1)}`);
check('noon az ~south (150-210)', noon >= 140 && noon <= 220, `got ${noon.toFixed(1)}`);
check('evening az NW (280-340)', evening >= 270 && evening <= 345, `got ${evening.toFixed(1)}`);

// 5. Winter solstice 2027 plausible (~Dec 21) + a Maeshowe winter sunset sanity
// (59N December sunset ~15:00 UTC, azimuth SW ~220-245).
const maeshowe = { lat: 58.9966, lon: -3.1882 };
const wseasons = getSeasons(2027);
const decStr = wseasons.decSolstice.toISOString().slice(0, 10);
check('dec solstice ~Dec 21 2027', decStr >= '2027-12-20' && decStr <= '2027-12-23', `got ${decStr}`);
const ms = getSunriseSunset(wseasons.decSolstice, maeshowe.lat, maeshowe.lon, 'sunset');
if (ms) {
	const mh = ms.time.getUTCHours() + ms.time.getUTCMinutes() / 60;
	check('maeshowe dec sunset ~15:00 UTC', mh >= 13 && mh <= 17, `got ${ms.time.toISOString()}`);
	check('maeshowe dec sunset az SW (~230)', ms.azimuth >= 210 && ms.azimuth <= 250, `got ${ms.azimuth.toFixed(1)}`);
} else {
	check('maeshowe dec sunset', false, 'null');
}

console.log('');
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
