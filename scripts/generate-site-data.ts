// Generate the app's site data from canon. Run after ANY canon edit.
//   npm run gen:sitedata                  -> production data (no dev site)
//   INCLUDE_DEV_SITE=1 npm run gen:sitedata -> includes the dev-only test site
import { writeFileSync, mkdirSync } from 'node:fs';
import { sites } from '../src/lib/server/sites.ts';
import { buildSiteData } from './site-data-core.ts';
import { devSite, DEV_SITE_SLUG } from './dev-site.ts';

const includeDevSite = process.env.INCLUDE_DEV_SITE === '1';
const data = buildSiteData(sites, { includeDevSite, devSite });

mkdirSync('src/lib/generated', { recursive: true });
writeFileSync('src/lib/generated/siteData.json', JSON.stringify(data, null, '\t') + '\n');

console.log(`wrote src/lib/generated/siteData.json  sites=${data.sites.length}  ` +
	`includeDevSite=${includeDevSite}  canonHash=${data.canonHash}`);
if (includeDevSite) console.log(`  INCLUDES DEV SITE '${DEV_SITE_SLUG}' — NOT for production`);
