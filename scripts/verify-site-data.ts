// Site-data gate: fails if src/lib/generated/siteData.json has drifted from
// sites.ts, and fails if a dev-only site appears in a production generation.
import { readFileSync, existsSync } from 'node:fs';
import { sites } from '../src/lib/server/sites.ts';
import { buildSiteData } from './site-data-core.ts';
import { devSite, DEV_SITE_SLUG } from './dev-site.ts';

const FILE = 'src/lib/generated/siteData.json';
const includeDevSite = process.env.INCLUDE_DEV_SITE === '1';
let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

console.log('--- GENERATED SITE DATA vs CANON ---');

check('generated file exists', existsSync(FILE), FILE);
if (!existsSync(FILE)) { console.log(''); console.log('1 CHECK(S) FAILED'); process.exit(1); }

const onDisk = JSON.parse(readFileSync(FILE, 'utf8'));
const fresh = buildSiteData(sites, { includeDevSite, devSite });

check('includeDevSite flag matches this build', onDisk.includeDevSite === includeDevSite,
	`file=${onDisk.includeDevSite} env=${includeDevSite}`);
check('canon hash matches a fresh generation (not stale)',
	onDisk.canonHash === fresh.canonHash, `file=${onDisk.canonHash} fresh=${fresh.canonHash}`);
check('site list is byte-identical to a fresh generation',
	JSON.stringify(onDisk.sites) === JSON.stringify(fresh.sites),
	`file=${onDisk.sites.length} sites, fresh=${fresh.sites.length} sites`);
check('every canon site is present',
	sites.every(s => onDisk.sites.some((d: { slug: string }) => d.slug === s.slug)),
	`${sites.length} canon sites`);

// The dev gate: a production generation must carry no dev-only slug.
if (!includeDevSite) {
	check('no dev-only site in production data',
		!onDisk.sites.some((s: { slug: string }) => s.slug === DEV_SITE_SLUG),
		`no '${DEV_SITE_SLUG}'`);
}

// Character must come from alignment data, not identity. Spot-check both shapes.
const ch = (slug: string) => onDisk.sites.find((s: { slug: string }) => s.slug === slug)?.character;
check('callanish derives moonlit (lunar, no solar)', ch('callanish') === 'moonlit', `got ${ch('callanish')}`);
check('drombeg derives solar', ch('drombeg') === 'solar', `got ${ch('drombeg')}`);

console.log('');
console.log(failures === 0 ? 'ALL SITE-DATA CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
