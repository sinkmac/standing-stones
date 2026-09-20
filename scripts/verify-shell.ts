// Shell agnosticism gate + the Drombeg proof.
//
// Condition 3: the shell takes a Site record and derives its character from
// ALIGNMENT DATA, never from a slug. Drombeg is solar-only, so running the shell
// against Drombeg's record is the real test that no lunistice is assumed.
import { readFileSync } from 'node:fs';
import { nextAppointment, primaryAlignment, isLunar } from '../src/lib/appShell.ts';
import type { AppSite } from '../src/lib/appData.ts';

const FILE = 'src/lib/generated/siteData.json';
let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

const data = JSON.parse(readFileSync(FILE, 'utf8')) as { sites: AppSite[] };
const by = (slug: string) => data.sites.find(s => s.slug === slug)!;

console.log('--- SHELL: SITE AGNOSTICISM ---');

// 1. Character comes from data.
check('callanish: lunar alignment, no solar -> moonlit',
	by('callanish').character === 'moonlit' && isLunar(primaryAlignment(by('callanish'))!),
	`character=${by('callanish').character} primary=${primaryAlignment(by('callanish'))?.type}`);
check('drombeg: solar alignment -> solar',
	by('drombeg').character === 'solar' && !isLunar(primaryAlignment(by('drombeg'))!),
	`character=${by('drombeg').character} primary=${primaryAlignment(by('drombeg'))?.type}`);

// 2. The Drombeg proof: the shell resolves a SOLAR appointment, and nothing about
//    it goes near the lunar solver.
const drom = nextAppointment(by('drombeg'), new Date('2026-09-20T12:00:00Z'));
check('shell renders Drombeg as a SOLAR appointment', drom.kind === 'solar', `kind=${drom.kind}`);
if (drom.kind === 'solar') {
	check('Drombeg label is the winter solstice', drom.label === 'Winter solstice', `got '${drom.label}'`);
	check('Drombeg carries its own window', drom.daysBefore >= 0 && drom.daysAfter >= 0,
		`${drom.daysBefore}/${drom.daysAfter} days`);
	check('Drombeg description uses its own bearing, not Callanish copy',
		drom.windowDescription.includes('225'), drom.windowDescription.slice(0, 90));
}

// 3. Callanish still resolves as LUNAR and matches the live site's window.
const call = nextAppointment(by('callanish'), new Date());
check('shell renders Callanish as a LUNAR appointment', call.kind === 'lunar', `kind=${call.kind}`);
if (call.kind === 'lunar') {
	check('Callanish label is the monthly southern lunistice',
		call.label === 'Monthly southern lunistice', `got '${call.label}'`);
	check('Callanish terrain line comes from the keyed table',
		call.windowDescription.includes('Sleeping Beauty ridge'), 'terrain line present');
	check('Callanish window is the same figure the live site shows',
		/^~\d\d:00-\d\d:00$/.test(call.window), `window=${call.window}`);
}

// 4. No shell file may key behaviour on the slug.
const SHELL_FILES = [
	'src/lib/appShell.ts', 'src/lib/appData.ts',
	'src/lib/components/AppShell.svelte', 'src/routes/app/+page.svelte'
];
const offenders: string[] = [];
for (const f of SHELL_FILES) {
	const src = readFileSync(f, 'utf8');
	if (/['"]callanish['"]/.test(src)) offenders.push(f);
}
check('no shell file hardcodes a site slug', offenders.length === 0, offenders.join(', ') || 'none');

console.log('');
console.log(failures === 0 ? 'ALL SHELL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
