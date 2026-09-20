// DEV-ONLY field-test site. Imported ONLY by the site-data generator and its
// gate — never by app code, never by canon, never by any route.
//
// WHY IT EXISTS: the field screens cannot ship on theory and nobody is
// travelling to Lewis to test them. The moon reaches its southern limit
// wherever you are, so the same lunar alignment, the same solver and the same
// countdown all work from a local horizon.
//
// WHAT IT DOES NOT TEST: whether the drag-to-match profile matches Callanish's
// actual ridge. That is a content check on one site and waits for the first
// real vigil there.
//
// Coordinates supplied by Sink: 56.676 N, -3.007 W (Kirriemuir) — a placeholder,
// to be replaced by a final southern-horizon point before field testing.
import type { Site } from '../src/lib/server/sites.ts';

export const DEV_SITE_SLUG = 'devtest';

export const devSite: Site = {
	slug: DEV_SITE_SLUG,
	name: 'Field test site',
	region: 'Development only',
	latitude: 56.676,
	longitude: -3.007,
	tier: 'surveyed',
	description:
		'Development-only test site for exercising the app against a local horizon. Same monthly southern lunistice as Callanish. Not a canon site and not a real place record.',
	marquee: false,
	registerSeeding: false,
	alignments: [
		{
			type: 'lunar-lunistice-south',
			description:
				'Monthly southern lunistice at the test latitude — the moon reaches its most southerly declination about every 27 days.',
			source: 'Development placeholder. No archaeological claim is made by this entry.',
			// Horizon-corrected rise azimuth at 56.676 N for dec ~ -28.0, h ~ 1 deg:
			// cos A = (sin(-28.0) - sin(56.676)sin(1)) / (cos(56.676)cos(1)) -> A ~ 152.
			bearing: 152,
			horizonAltitude: 1.0,
			event: 'moonrise'
		}
	]
};
