// Shell strings — the app's per-site words, in a KEYED TABLE, not inside
// components. Keying copy on a slug inside a component is how the shell stops
// being site-agnostic; the table is data, and the fallback is generic.
//
// Also the register copy (see registerCopy.ts) and the empty-state strings
// previously inlined in FieldInstrument, kept verbatim there.

/** The terrain half of a lunar description: what the moon rises over. A sky
 *  fact ("reaches its most southerly declination") is generic; the landform is
 *  per-site, sourced, and therefore data. */
export const LUNAR_TERRAIN_LINE: Record<string, string> = {
	callanish: 'rising low from the Sleeping Beauty ridge to the south-south-east'
	// Deliberately NO dev-site key: the dev slug must never appear in production
	// copy. The generic fallback below covers it, and verify-prod-bundle asserts
	// the slug is absent from the built output.
};

export function terrainLine(slug: string): string {
	return LUNAR_TERRAIN_LINE[slug] ?? 'rising low against the southern horizon';
}

/** Empty-register copy. The originally-shipped per-site literals are kept
 *  verbatim (Callanish's live page must not reword); the fallback is generic. */
export const EMPTY_BOOK: Record<string, string[]> = {
	callanish: [
		'The Callanish register is quiet — no one has recorded a vigil yet.',
		'That absence is information too. Yours would be an honest first line.'
	]
};

export function emptyBook(slug: string, siteName: string): string[] {
	return EMPTY_BOOK[slug] ?? [
		`The ${siteName} register is quiet — no one has recorded a vigil yet.`,
		'That absence is information too. Yours would be an honest first line.'
	];
}

export function emptyNext(slug: string, siteName: string): string {
	return slug === 'callanish'
		? 'No dated upcoming vigil for Callanish is currently available.'
		: `No dated upcoming vigil for ${siteName} is currently available.`;
}

/** Alignment type -> human label. Canon words, no invention. */
export function alignmentLabel(type?: string): string {
	switch (type) {
		case 'summer-solstice': return 'Summer solstice';
		case 'winter-solstice': return 'Winter solstice';
		case 'equinox': return 'Equinox';
		case 'lunar-lunistice-south': return 'Monthly southern lunistice';
		case 'lunar-standstill': return 'Lunar standstill';
		default: return 'Next alignment';
	}
}
