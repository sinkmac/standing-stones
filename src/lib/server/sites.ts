// Site canon data — source of truth for the initial 6 sites

import type { DateConfidenceTier } from './ancestral';

export type ProvenanceTier = 'surveyed' | 'traditional';
export type AlignmentType = 'summer-solstice' | 'winter-solstice' | 'equinox' | 'lunar-standstill' | 'lunar-lunistice-south';

export interface Alignment {
	type: AlignmentType;
	/** Human-readable description of the alignment */
	description: string;
	/** Published source citation */
	source: string;
	/** Approximate bearing in degrees true north */
	bearing: number;
	/** Horizon altitude at the bearing in degrees (negative for obscured, 0 for sea horizon) */
	horizonAltitude: number;
	/** Whether the alignment is sunrise or sunset */
	event: 'sunrise' | 'sunset';
}

export interface AccessInfo {
	/** General access description */
	description: string;
	/** Is there a lottery/ballot system? */
	lottery: boolean;
	/** Is there managed access (booking required)? */
	managedAccess: boolean;
	/** Is the site freely open at any time? */
	openAccess: boolean;
	/** Last verified date for access info (YYYY-MM-DD) */
	lastVerified: string;
}

export interface EnrichmentContent {
	/** Curated dark-sky sentence for this site. Leads with closure on managed-access sites. */
	darkSky: string;
	/** How to get from where you leave the car to where you stand. Nullable — prose only, never coordinates. */
	approach: string;
}

export interface Site {
	/** URL-friendly slug */
	slug: string;
	/** Display name */
	name: string;
	/** Alternative names */
	altName?: string;
	/** Latitude (WGS84) */
	latitude: number;
	/** Longitude (WGS84) */
	longitude: number;
	/** Region / country */
	region: string;
	/** Provenance tier for this site */
	tier: ProvenanceTier;
	/** Documented alignments */
	alignments: Alignment[];
	/** Access information */
	access: AccessInfo;
	/** Short description of the site */
	description: string;
	/** Is this a marquee/headline site? */
	marquee: boolean;
	/** Is this a register-seeding site (open access, generates vigils)? */
	registerSeeding: boolean;
	/**
	 * Construction-date-confidence tier — separate axis from alignment-geometry
	 * confidence. Both must be at max confidence for ancestral-sky pilot eligibility.
	 * Three-valued: 'eligible' | 'not-applicable' | 'unknown'
	 */
	dateConfidence?: DateConfidenceTier;
	/** Enrichment bundle — dark sky and approach content */
	enrichment?: EnrichmentContent;
}

export const sites: Site[] = [
	{
		slug: 'ballochroy',
		name: 'Ballochroy',
		region: 'Kintyre, Scotland',
		latitude: 55.71195,
		longitude: -5.61396,
		tier: 'surveyed',
		description: 'Three standing stones aligned with the midsummer sunset over the Isle of Jura. Alexander Thom\'s key alignment site.',
		marquee: false,
		registerSeeding: true,
		enrichment: {
			approach: 'Park at the A83 bridge, or the beach layby just south. The farm track is unsignposted — the landmark is a barn with a red roof. Ten to twenty minutes on foot depending on where you get parked, uphill on rough track. The stones aren\'t visible from the road until you\'re nearly on them. Working farm: gates closed, dogs on leads.',
			darkSky: 'Very little artificial light on this stretch of the Kintyre coast, and the sea horizon west towards Jura is unlit. No formal dark-sky designation here — just a quiet road and a long way to the nearest town.'
		},
		alignments: [
			{
				type: 'summer-solstice',
				description: 'Midsummer sunset — the central and shortest stones frame the midsummer sunset over Cora Bheinn on Jura',
				source: 'Thom, A. (1971) Megalithic Lunar Observatories, OUP',
				bearing: 235,
				horizonAltitude: 1.5,
				event: 'sunset'
			}
		],
		access: {
			description: 'Open access on farmland near Kilchiaran Bay, Kintyre. No restrictions.',
			lottery: false,
			managedAccess: false,
			openAccess: true,
			lastVerified: '2026-07-20'
		}
	},
	{
		slug: 'drombeg',
		name: 'Drombeg Stone Circle',
		altName: 'The Druid\'s Altar',
		region: 'County Cork, Ireland',
		latitude: 51.56456,
		longitude: -9.08702,
		tier: 'surveyed',
		description: 'A 13-stone axial circle with a SW axis framing the midwinter sunset. Among the most visited megalithic sites in Ireland.',
		marquee: false,
		registerSeeding: true,
		enrichment: {
			approach: 'Small car park at the end of the lane, room for about ten cars. Two to five minutes on a maintained path with a slight rise. Exposed, and often wet underfoot.',
			darkSky: 'Rural West Cork with the Atlantic to the south. Glandore and Rosscarbery put a little light into the eastern sky; the seaward side stays dark.'
		},
		alignments: [
			{
				type: 'winter-solstice',
				description: 'Winter solstice sunset — the SW axis orients the monument toward the setting sun at midwinter',
				source: 'Fahy, E.M. (1957) Excavation report, Journal of the Cork Historical and Archaeological Society',
				bearing: 225,
				horizonAltitude: 1.0,
				event: 'sunset'
			}
		],
		access: {
			description: 'Open access via maintained path. Well-visited but rarely crowded at dawn in winter.',
			lottery: false,
			managedAccess: false,
			openAccess: true,
			lastVerified: '2026-07-20'
		}
	},
	{
		slug: 'maeshowe',
		name: 'Maeshowe',
		altName: 'Maes Howe',
		region: 'Orkney, Scotland',
		latitude: 58.9966,
		longitude: -3.1882,
		tier: 'surveyed',
		description: 'Neolithic chambered cairn aligned so that sunlight enters the passage at the winter solstice sunset. Part of the Heart of Neolithic Orkney UNESCO site.',
		marquee: false,
		registerSeeding: true,
		enrichment: {
			approach: 'Guided tour only, booked ahead, departing on the hour from the visitor centre at Stenness. A five-minute shuttle, then about 400 metres on foot — gravel, stone and uneven grass, two latch gates, a crossing of a busy main road, and a short steep slope at the entrance. Open daily. To be in the chamber for the midwinter sunset, book the 2pm tour — only possible in the six weeks or so either side of the solstice.',
			darkSky: 'Managed timed-tour access only — the last tour of the day is 4pm. The winter solstice sunset falls at around 15:15 UTC, which lands inside the 2pm tour, so visitors are in the chamber as sunlight floods the passage. Booking ahead is essential: entry is by managed, limited-capacity timed tour, not open access. Orkney beyond the site has very little light pollution — over twelve hours of true dark around midwinter, no darkness at all from May to July, and the Merry Dancers most likely between October and March.'
		},
		alignments: [
			{
				type: 'winter-solstice',
				description: 'Winter solstice sunset — sunlight enters the passage and reaches the rear wall of the central chamber',
				source: 'Piggott, S.; Ritchie, A. — published archaeology surveys',
				bearing: 225,
				horizonAltitude: 0.5,
				event: 'sunset'
			}
		],
		access: {
			description: 'Managed by Historic Environment Scotland. Seasonal opening hours. Booking required in winter — limited slots during the solstice window.',
			lottery: false,
			managedAccess: true,
			openAccess: false,
			lastVerified: '2026-07-20'
		},
		dateConfidence: { type: 'eligible', circaYear: -2800, range: 100, evidence: 'Single-phase Neolithic chambered cairn, securely dated within Orkney Neolithic chronology.' }
	},
	{
		slug: 'newgrange',
		name: 'Newgrange',
		altName: 'Sí an Bhrú',
		region: 'County Meath, Ireland',
		latitude: 53.69473,
		longitude: -6.47557,
		tier: 'surveyed',
		description: 'Neolithic passage tomb with a roofbox aligned to the winter solstice sunrise. Older than Stonehenge and the Egyptian pyramids.',
		marquee: true,
		registerSeeding: false,
		enrichment: {
			approach: 'No walk-in access. Every visit starts at the Brú na Bóinne visitor centre, about five minutes on foot to the shuttle pick-up across the footbridge, then a shuttle bus to the mound. Guided tour only, pre-booking essential, and the solstice mornings are allocated by lottery.',
			darkSky: 'No after-hours access — the solstice mornings, by lottery, are the only exception. The Boyne Valley around it is farmland, dark but for a lift from Drogheda to the east; any night sky here is seen from the surrounding lanes, not the mound.'
		},
		alignments: [
			{
				type: 'winter-solstice',
				description: 'Winter solstice sunrise — sunlight enters through the roofbox above the entrance and floods the inner chamber',
				source: "O'Kelly, M.J. (1982) Newgrange: Archaeology, Art and Legend, Thames & Hudson",
				bearing: 135,
				horizonAltitude: 2.0,
				event: 'sunrise'
			}
		],
		access: {
			description: 'Lottery-access only for the winter solstice. General tours available year-round via the Brú na Bóinne visitor centre.',
			lottery: true,
			managedAccess: true,
			openAccess: false,
			lastVerified: '2026-07-20'
		},
		dateConfidence: { type: 'eligible', circaYear: -3100, range: 100, evidence: 'Single-phase passage tomb, securely dated via O\'Kelly (1982) and subsequent archaeology.' }
	},
	{
		slug: 'stonehenge',
		name: 'Stonehenge',
		region: 'Wiltshire, England',
		latitude: 51.17889,
		longitude: -1.82611,
		tier: 'surveyed',
		description: 'The most famous megalithic monument in the world. Its solstitial axis is one of the most surveyed alignments in archaeoastronomy.',
		marquee: true,
		registerSeeding: false,
		enrichment: {
			approach: 'Shuttle from the visitor centre, about ten minutes each way, running every few minutes, year-round. Or a walk-in of twenty-five to thirty-five minutes, about a mile and a half across the landscape.',
			darkSky: 'The stones close at night. Cranborne Chase, an International Dark Sky Reserve since 2019, begins a short way south — Stonehenge itself sits just outside its boundary, with the A303 running close by.'
		},
		alignments: [
			{
				type: 'summer-solstice',
				description: 'Summer solstice sunrise — the monument\'s NE entrance was widened to match the midsummer sunrise direction',
				source: 'Ruggles, C. (ed.) Records in Stone: Papers in Memory of Alexander Thom; multiple published surveys',
				bearing: 50,
				horizonAltitude: 1.0,
				event: 'sunrise'
			},
			{
				type: 'winter-solstice',
				description: 'Winter solstice sunset — the great trilithon and Avenue align with the midwinter sunset',
				source: 'Ruggles, C.; Parker Pearson, M.; multiple published surveys',
				bearing: 230,
				horizonAltitude: 1.0,
				event: 'sunset'
			}
		],
		access: {
			description: 'Managed by English Heritage. Summer solstice: managed open access (booked entry). Winter solstice: managed access (limited numbers). Access policy changes annually.',
			lottery: false,
			managedAccess: true,
			openAccess: false,
			lastVerified: '2026-07-20'
		}
	},
	{
		slug: 'callanish',
		name: 'Callanish Stones',
		altName: 'Calanais I',
		region: 'Isle of Lewis, Scotland',
		latitude: 58.19754,
		longitude: -6.74514,
		tier: 'surveyed',
		description: 'Prehistoric stone circle with a cruciform layout and central monolith. The lunar standstill alignment has been studied at this exact site since Thom\'s original work (1971), with independent fieldwork by Curtis and Ponting and a 2016 statistical study by Higginbottom et al. calculating over 97.87% likelihood of intentional alignment.',
		marquee: false,
		registerSeeding: false,
		enrichment: {
			approach: 'Free car park next to the visitor centre. Two to five minutes uphill on uneven ground to the stones. The visitor centre and café are open Monday to Saturday, closed Sunday. The stones themselves stand open at any hour, every day of the year.',
			darkSky: 'Among the darkest skies in Britain, with no formal designation and little need for one — the island is largely unlit. No true darkness from late May into July; aurora possible September through April.'
		},
		alignments: [
			{
				type: 'lunar-standstill',
				description: 'Lunar standstill (major standstill, ~18.6-year cycle) — the cross-shaped layout aligns with the moon at its extreme declination',
				source: 'Thom, A. Megalithic Lunar Observatories (1971); Curtis & Ponting fieldwork; Higginbottom et al. 2016 (97.87% likelihood). Critiques of broader Thom tradition: Sims 2007, Mediterranean Archaeology & Archaeometry.',
				bearing: 190,
				horizonAltitude: 1.0,
				event: 'sunset'
			},
			{
				type: 'lunar-lunistice-south',
				description: 'Monthly southern lunistice (~27.21-day draconic month) — at the moon\'s most southerly extent each month, its low moonrise skims the Sleeping Beauty ridge to the south; the southern stone row frames this event',
				source: 'Thom, A. Megalithic Lunar Observatories (1971); Curtis & Ponting; Higginbottom et al. 2016. Monthly lunistice recognised as a recurring dawn within the standstill cycle.',
				bearing: 190,
				horizonAltitude: 1.0,
				event: 'sunset'
			}
		],
		access: {
			description: 'Managed by Historic Environment Scotland. Accessible year-round. No booking required.',
			lottery: false,
			managedAccess: false,
			openAccess: true,
			lastVerified: '2026-07-20'
		},
		dateConfidence: { type: 'not-applicable', circaYear: -2750, range: 200, evidence: 'Multi-axial layout suggests a longer use period; single-phase date is not established. Held as provisional for ancestral-sky.' }
	},
	{
		slug: 'clava-cairns',
		name: 'Balnuaran of Clava',
		altName: 'Clava Cairns',
		region: 'Highland, Scotland',
		latitude: 57.473,
		longitude: -4.074,
		tier: 'surveyed',
		description: 'Three Early Bronze Age passage-graves near Inverness, oriented to midwinter sunset. The passages align so the setting solstice sun shines directly into the chambers. Surveyed independently by Somerville (1910), MacKie (1975), and Bradley (2000).',
		marquee: false,
		registerSeeding: true,
		alignments: [
			{
				type: 'winter-solstice',
				description: 'Winter solstice sunset — the passage of the southwest cairn is oriented so the setting solstice sun shines directly down the corridor. Caveat: the alignment is a cemetery-wide orientation, not a single-point sightline; the southwest cairn is the primary observation point.',
				source: 'Somerville, H.B. (1910); MacKie, E. (1975); Bradley, R. (2000) The Good Stones, Society of Antiquaries of Scotland monograph no. 17; Scott, D. (2016) Journal of Skyscape Archaeology Vol. 2 No. 1.',
				bearing: 225,
				horizonAltitude: 1.0,
				event: 'sunset'
			}
		],
		access: {
			description: 'Managed by Historic Environment Scotland. Open access, free entry, no booking required.',
			lottery: false,
			managedAccess: false,
			openAccess: true,
			lastVerified: '2026-08-09'
		},
		dateConfidence: { type: 'not-applicable', circaYear: -2000, range: 200, evidence: 'Early Bronze Age passage-grave cemetery, dated c. 2000 BCE via Bradley (2000) The Good Stones excavation; multi-cairn cemetery — single-phase date not established.' }
	}
];

export function getSite(slug: string): Site | undefined {
	return sites.find(s => s.slug === slug);
}

export function getRegisterSeedingSites(): Site[] {
	return sites.filter(s => s.registerSeeding);
}

export function getCanonSize(): { total: number; surveyed: number; traditional: number } {
	return {
		total: sites.length,
		surveyed: sites.filter(s => s.tier === 'surveyed').length,
		traditional: sites.filter(s => s.tier === 'traditional').length
	};
}