// Field guide presentation data — merged with canon sites.ts at render time.
// Additive only: does not modify sites.ts or any canon/alignment data.
//
// ID mapping from the static prototype:
//   'calanais'  -> existing route slug 'callanish'
//   'clava'     -> existing route slug 'clava-cairns'
//
// Photography credits & licences (public-launch fix #1):
//   stonehenge.jpg — Zaxx / Unsplash (retained, credited)
//   calanais.jpg   — Otter / Wikimedia Commons (replaces Adventure Canada reference asset)
//   drombeg.jpg    — Wikimedia Commons contributor (replaces Marcie in Mommyland reference asset)
//   maeshowe.jpg   — User:Museum / Wikimedia Commons, public domain (replaces TheCollector reference asset)
//   newgrange.jpg  — Adrien Olichon / Unsplash (replaces illustrative plan)
//   clava.jpg      — Wikimedia Commons contributor (replaces illustrative plan)
//   ballochroy.jpg — Wikimedia Commons contributor (replaces illustrative plan)
//   hero.jpg       — omitted (unused exploratory download)

import type { Site } from '$lib/server/sites';

export interface FieldGuideSite {
	slug: string;            // existing canon slug (callanish, clava-cairns, etc.)
	name: string;
	region: string;
	country: 'Scotland' | 'Ireland' | 'England';
	latitude: number;        // from sites.ts (canon, more precise)
	longitude: number;       // from sites.ts (canon, more precise)
	kind: string;            // e.g. 'SOLSTICE · SUNRISE & SUNSET'
	caption: string;
	season: string;          // visitor-facing season window
	evidence: string;        // 'Documented solar alignment' | 'Proposed lunar interpretation' | etc.
	look: string;            // where to look / what to observe
	date: string | null;     // 'MM-DD' only where a verified solar date exists; null otherwise
	source: string;          // official information URL
	sourceName: string;
	image: string;           // filename in static/images/standing-stones/
}

/**
 * Prototype IDs map to canon slugs. The static prototype used 'calanais' and
 * 'clava'; the existing app routes use 'callanish' and 'clava-cairns'.
 */
const SLUG_MAP: Record<string, string> = {
	calanais: 'callanish',
	clava: 'clava-cairns',
};

function canonSlug(protoId: string): string {
	return SLUG_MAP[protoId] ?? protoId;
}

/**
 * Field guide site data. Coordinates come from sites.ts (canon) — the
 * prototype's rounded values are not used. Photograph filenames reference
 * assets in static/images/standing-stones/.
 */
export const fieldGuideSites: FieldGuideSite[] = [
	{
		slug: 'stonehenge',
		name: 'Stonehenge',
		region: 'Wiltshire',
		country: 'England',
		latitude: 51.17889,
		longitude: -1.82611,
		kind: 'SOLSTICE · SUNRISE & SUNSET',
		caption: 'A monumental frame for the turning year.',
		season: 'Around the June and December solstices',
		evidence: 'Documented solar alignment',
		look: 'The winter sunset lies towards the south-west; the summer sunrise towards the north-east. Follow official visitor guidance rather than using this overview as a position guide.',
		date: null,
		source: 'https://www.english-heritage.org.uk/visit/places/stonehenge/things-to-do/solstice/',
		sourceName: 'English Heritage',
		image: 'stonehenge.jpg',
	},
	{
		slug: 'callanish',
		name: 'Calanais',
		region: 'Isle of Lewis',
		country: 'Scotland',
		latitude: 58.19754,
		longitude: -6.74514,
		kind: 'MOON · A LUNAR QUESTION',
		caption: 'Ancient gneiss beneath an immense island sky.',
		season: 'Explore year-round · no predicted lunar event',
		evidence: 'Proposed lunar interpretation',
		look: 'Look at how the stones sit against the southern hills. This guide does not predict a standstill viewing date or claim a confirmed lunar sightline.',
		date: null,
		source: 'https://www.historicenvironment.scot/visit/all/calanais-standing-stones/',
		sourceName: 'Historic Environment Scotland',
		image: 'calanais.jpg',
	},
	{
		slug: 'drombeg',
		name: 'Drombeg',
		region: 'County Cork',
		country: 'Ireland',
		latitude: 51.56456,
		longitude: -9.08702,
		kind: 'MIDWINTER · SUNSET',
		caption: 'A small circle with a wide western horizon.',
		season: 'Around the winter solstice · exact window unverified',
		evidence: 'Solar orientation described by OPW',
		look: 'Explore the view across the circle towards its axial stone and the south-western horizon. The landscape matters as much as the stone setting.',
		date: null,
		source: 'https://heritageireland.ie/unguided-sites/drombeg-stone-circle/',
		sourceName: 'Heritage Ireland / OPW',
		image: 'drombeg.jpg',
	},
	{
		slug: 'maeshowe',
		name: 'Maeshowe',
		region: 'Orkney',
		country: 'Scotland',
		latitude: 58.9966,
		longitude: -3.1882,
		kind: 'MIDWINTER · CHAMBER LIGHT',
		caption: 'The setting sun reaches into a Neolithic chamber.',
		season: 'Roughly late November to mid-January',
		evidence: 'Documented solar illumination',
		look: 'Inside the monument, the experience is the light moving along the passage. The official site currently points winter visitors towards the afternoon tour; confirm directly before booking.',
		date: null,
		source: 'https://www.historicenvironment.scot/visit/all/maeshowe-chambered-cairn/',
		sourceName: 'Historic Environment Scotland',
		image: 'maeshowe.jpg',
	},
	{
		slug: 'newgrange',
		name: 'Newgrange',
		region: 'County Meath',
		country: 'Ireland',
		latitude: 53.69473,
		longitude: -6.47557,
		kind: 'MIDWINTER · SUNRISE',
		caption: 'A passage built to receive the first winter light.',
		season: '19–23 December · weather dependent',
		evidence: 'Documented solar illumination',
		look: 'The roof-box, rather than the doorway, admits the light. An ordinary visit can explain the design even when the seasonal illumination is not happening.',
		date: null,
		source: 'https://heritageireland.ie/visit/https-heritageireland-ie-winter-solstice/',
		sourceName: 'Heritage Ireland / OPW',
		image: 'newgrange.jpg',
	},
	{
		slug: 'clava-cairns',
		name: 'Clava Cairns',
		region: 'Highland',
		country: 'Scotland',
		latitude: 57.473,
		longitude: -4.074,
		kind: 'PASSAGE CAIRNS · WINTER SKY',
		caption: 'Stone circles and cairns in a quieter landscape.',
		season: 'Explore year-round · winter orientation',
		evidence: 'Interpretation to explore',
		look: 'Compare the orientations of the passage entrances. Treat any apparent alignment as an observation to investigate, not proof of the builders’ intent.',
		date: null,
		source: 'https://www.historicenvironment.scot/visit/all/clava-cairns/',
		sourceName: 'Historic Environment Scotland',
		image: 'clava.jpg',
	},
	{
		slug: 'ballochroy',
		name: 'Ballochroy',
		region: 'Kintyre',
		country: 'Scotland',
		latitude: 55.71195,
		longitude: -5.61396,
		kind: 'STONE ROW · LANDSCAPE',
		caption: 'Three stones, distant hills and an open question.',
		season: 'Explore year-round · proposed solar connections',
		evidence: 'Proposed alignment · not a prediction',
		look: 'Record your view of the stones and the distant horizon. A useful field note distinguishes what you saw from what you think it might mean.',
		date: null,
		source: 'https://canmore.org.uk/site/38468/ballochroy',
		sourceName: 'Canmore national record',
		image: 'ballochroy.jpg',
	},
];

export function getFieldGuideSite(slug: string): FieldGuideSite | undefined {
	return fieldGuideSites.find(s => s.slug === slug);
}

export function getFieldGuideSiteByProtoId(protoId: string): FieldGuideSite | undefined {
	return fieldGuideSites.find(s => s.slug === canonSlug(protoId));
}

export const COUNTRIES = ['Scotland', 'Ireland', 'England'] as const;

export const PHOTO_CREDITS: Record<string, { author: string; licence: string; source: string }> = {
	stonehenge: {
		author: 'Zaxx / Unsplash',
		licence: 'Unsplash License',
		source: 'https://unsplash.com/photos/stonehenge-england-during-day-q-7BxOvJJ14',
	},
	calanais: {
		author: 'Otter / Wikimedia Commons',
		licence: 'Wikimedia Commons',
		source: 'https://commons.wikimedia.org/wiki/File:Calanais_Standing_Stones_20090610_01.jpg',
	},
	drombeg: {
		author: 'Wikimedia Commons contributor',
		licence: 'Wikimedia Commons',
		source: 'https://commons.wikimedia.org/wiki/File:Drombeg-stone-circle-west-cork.JPG',
	},
	maeshowe: {
		author: 'User:Museum / Wikimedia Commons',
		licence: 'Public domain',
		source: 'https://commons.wikimedia.org/wiki/File:Orkn_Maeshowe_view.JPG',
	},
	newgrange: {
		author: 'Adrien Olichon / Unsplash',
		licence: 'Unsplash License',
		source: 'https://unsplash.com/photos/ancient-mound-structure-with-green-grass-and-blue-sky-2MH8XpW4OCk',
	},
	clava: {
		author: 'Wikimedia Commons contributor',
		licence: 'Wikimedia Commons',
		source: 'https://commons.wikimedia.org/wiki/File:Ring_Cairn.jpg',
	},
	ballochroy: {
		author: 'Wikimedia Commons contributor',
		licence: 'Wikimedia Commons',
		source: 'https://commons.wikimedia.org/wiki/File:Ballochroy%2CStanding_Stones_Group.jpg',
	},
};