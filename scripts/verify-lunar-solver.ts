// Verify the monthly southern lunar lunistice solver in lunarLunistice.ts.
// Imports the REAL modules (not copies). Ground truth is ephem 4.2.1 computed
// independently (scratch venv): next lunistice from 2026-08-09 is
//   2026-08-22 ~11:00 UTC, declination -28.12, rise az ~153.4 deg (gibbous).
// Also sanity-checks Ballochroy's solar solver is unchanged, and the failure
// path (no throw) returns null so the route can emit a gap.
import { calculateNextLunarLunistice, findNextSouthernLunistice, moonPosition, moonriseAzimuth, moonPhaseBand } from '../src/lib/server/lunarLunistice.ts';
import { getSunriseSunset, getSeasons } from '../src/lib/server/alignments.ts';
import { getSite } from '../src/lib/server/sites.ts';

const RAD = 180 / Math.PI;
let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

// ---- Reference epoch (deterministic) ----
const NOW = new Date(Date.UTC(2026, 7, 9, 12, 0, 0)); // 2026-08-09
const LAT = 58.19754; // Callanish (canon)

console.log('--- LUNAR LUNISTICE SOLVER ---');
const lun = calculateNextLunarLunistice(NOW, LAT);
if (!lun) {
	check('solver runs without error', false, 'returned null from today');
} else {
	const dateOk = Math.abs(lun.datetime.getTime() - Date.UTC(2026, 7, 22, 11, 0, 0)) <= 86400000;
	check('next lunistice within 30 days', lun.daysUntil <= 30, `days_until=${lun.daysUntil}`);
	check('datetime ~2026-08-22 (vs ephem)', dateOk, `got ${lun.datetime.toISOString()}`);
	check('declination negative (southern)', lun.declinationDeg < 0, `got ${lun.declinationDeg.toFixed(2)}`);
	// Accepted bound per brief decision: more negative than -20, consistent w/ descending cycle.
	check('declination < -20 (post-peak sensible)', lun.declinationDeg < -20, `got ${lun.declinationDeg.toFixed(2)}`);
	// Still near the 2025 peak (descending): expect ~-27..-28, within 0.5 of ephem.
	check('declination ~ -28 (ephem -28.12)', Math.abs(lun.declinationDeg + 28.12) <= 0.5, `got ${lun.declinationDeg.toFixed(2)}`);
	check('moonrise az > 150 (arccos sin/cos phi)', lun.riseAzimuthDeg > 150, `got ${lun.riseAzimuthDeg.toFixed(1)}`);
	check('moonrise az ~153 (ephem reference)', Math.abs(lun.riseAzimuthDeg - 153.4) <= 3, `got ${lun.riseAzimuthDeg.toFixed(1)}`);
	check('moon phase reported', ['new','crescent','quarter','gibbous','full'].includes(lun.phaseBand), `got ${lun.phaseBand}`);
	check('phase band gibbous (ephem 72%)', lun.phaseBand === 'gibbous', `got ${lun.phaseBand} (${(lun.phase*100).toFixed(0)}%)`);
}

// ---- Live-from-today (no fixed date; must run + still be within 30d) ----
console.log('--- LIVE FROM TODAY ---');
const live = calculateNextLunarLunistice(new Date(), LAT);
check('live run without error', live !== null, live ? `next ${live.datetime.toISOString().slice(0,10)} dec ${live.declinationDeg.toFixed(1)}` : 'null');
if (live) check('live days_until within 30', live.daysUntil <= 30, `days_until=${live.daysUntil}`);
const bandOk = live && moonPhaseBand(live.phase);
check('live phase band valid', !!bandOk, bandOk || '');

// ---- Failure path: impossible window must return null, not throw ----
console.log('--- FAILURE PATH ---');
let threw = false, ret: unknown;
try {
	ret = findNextSouthernLunistice(NOW, LAT, 0.1); // 0.1 day window: no lunistice inside
} catch (e) {
	threw = true; ret = e;
}
check('failure returns null (no throw)', !threw && ret === null, threw ? 'threw' : String(ret));

// ---- moonPosition/phase units sanity (rad->deg handled correctly) ----
console.log('--- UNIT SANITY ---');
const p = moonPosition(lun ? Date.UTC(2026, 7, 22, 11, 0, 0) / 86400000 + 2440587.5 : 0);
check('moonPosition declination in degrees', Math.abs((p.declination * RAD) + 28.12) <= 0.5, `got ${(p.declination*RAD).toFixed(2)}`);
check('moonriseAzimuth(dec=-28.12, lat=58.19754)', Math.abs(moonriseAzimuth(-28.12, LAT) - 153.4) <= 3, `got ${moonriseAzimuth(-28.12, LAT).toFixed(1)}`);

// ---- Ballochroy solar unchanged + Callanish canon now carries the new type ----
console.log('--- BALLOCHEMOY SOLAR / CANON ---');
const ballo = { lat: 55.71195, lon: -5.61396 };
const seasons = getSeasons(2027);
const junStr = seasons.junSolstice.toISOString().slice(0, 10);
check('ballochroy jun solstice ~2027-06-21', junStr >= '2027-06-20' && junStr <= '2027-06-22', `got ${junStr}`);
const bSS = getSunriseSunset(seasons.junSolstice, ballo.lat, ballo.lon, 'sunset');
if (bSS) {
	const utcH = bSS.time.getUTCHours() + bSS.time.getUTCMinutes() / 60;
	check('ballochroy sunset ~20:40 UTC unchanged', utcH >= 19 && utcH <= 22, `got ${bSS.time.toISOString()}`);
	check('ballochroy sunset az NW unchanged', bSS.azimuth >= 270 && bSS.azimuth <= 340, `got ${bSS.azimuth.toFixed(1)}`);
} else {
	check('ballochroy sunset', false, 'null');
}
const callanishSite = getSite('callanish');
check('callanish has lunar-lunistice-south alignment',
	callanishSite?.alignments.some(a => a.type === 'lunar-lunistice-south') === true,
	callanishSite?.alignments.map(a => a.type).join(', ') || 'no site');
check('callanish still has lunar-standstill alignment',
	callanishSite?.alignments.some(a => a.type === 'lunar-standstill') === true, 'kept separate');

console.log('');
console.log(failures === 0 ? 'ALL LUNAR CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);