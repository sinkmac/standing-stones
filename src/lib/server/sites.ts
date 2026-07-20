// Site canon data — source of truth for the initial 6 sites

export type ProvenanceTier = 'surveyed' | 'traditional';

export type AlignmentType = 'summer-solstice' | 'winter-solstice' | 'equinox' | 'lunar-standstill';

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
	/** Construction date range for ancestral-sky (if applicable) */
	constructionDate?: { circa: number; range: number; singlePhase: boolean };
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
		constructionDate: { circa: 2800, range: 100, singlePhase: true }
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
		constructionDate: { circa: 3100, range: 100, singlePhase: true }
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
		tier: 'traditional',
		description: 'Prehistoric stone circle with a cruciform layout and central monolith. The lunar standstill claim is documented in published literature but extensively disputed.',
		marquee: false,
		registerSeeding: true,
		alignments: [
			{
				type: 'lunar-standstill',
				description: 'Lunar standstill (major standstill, ~18.6-year cycle) — the cross-shaped layout is claimed to align with the moon at its extreme declination',
				source: 'Ruggles, C.; Curtis. Claim extensively disputed within the published literature.',
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
		constructionDate: { circa: 2750, range: 200, singlePhase: false }
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