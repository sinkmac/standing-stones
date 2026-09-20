// Field-mode palette — held as data, not buried in component CSS, so a gate can
// MEASURE it (Amendment 005: demonstrated, not asserted). Field mode is red on
// near-black: nothing white, nothing that wrecks night vision.
//
// The split is deliberate: `ground`/`surface`/`raised`/`line` are BACKGROUNDS and
// must be dark; `ink`/`accentInk` are GLYPHS and may be light. "No white
// surfaces" is about backgrounds.

export interface Palette {
	ground: string;
	surface: string;
	raised: string;
	line: string;
	ink: string;
	muted: string;
	accent: string;
	accentInk: string;
}

/** Field mode: red on near-black. */
export const FIELD_PALETTE: Palette = {
	ground: '#0a0505',
	surface: '#150807',
	raised: '#1d0b09',
	line: '#3a1512',
	ink: '#f0a59a',
	muted: '#a3543f',
	accent: '#e0452f',
	accentInk: '#ffd9d2'
};

/** The quieter dark ground used by the non-field steps (prepare, countdown,
 *  record, saved). Still no white surface — the whole flow stays dark so no
 *  screen white-flashes into the next. */
export const NIGHT_PALETTE: Palette = {
	ground: '#04060e',
	surface: '#101728',
	raised: '#131b2e',
	line: '#1d2740',
	ink: '#eef1f8',
	muted: '#8e9ab5',
	accent: '#d9c27a',
	accentInk: '#f0e6c2'
};

/** Backgrounds only — the keys that must never be white. */
export const SURFACE_KEYS: (keyof Palette)[] = ['ground', 'surface', 'raised', 'line'];

function srgbChannel(v: number): number {
	const c = v / 255;
	return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a #rrggbb colour (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
	const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
	const n = parseInt(m[1], 16);
	const r = (n >> 16) & 0xff;
	const g = (n >> 8) & 0xff;
	const b = n & 0xff;
	return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** True when a colour is dark enough to count as a "no white surface" ground. */
export function isDarkSurface(hex: string, maxLuminance = 0.12): boolean {
	return relativeLuminance(hex) <= maxLuminance;
}
