// The app shell's resolution logic — pure, no DOM, no imports from src/lib/server.
//
// THE SHELL TAKES A SITE RECORD AS ITS ONLY INPUT. What kind of appointment a
// site has is decided by its ALIGNMENT DATA, never by its slug:
//   - a lunar alignment  -> computed locally with the shared solver (works offline)
//   - a solar alignment  -> rendered from the generated data
// Drombeg is solar-only, so this file must never assume a lunistice.
import type { AppSite, AppAlignment } from './appData.ts';
import { findNextSouthernLunistice, lunisticeLocalWindow } from './lunarLunistice.ts';
import { alignmentLabel, terrainLine } from './shellStrings.ts';

export interface LunarAppointment {
	kind: 'lunar';
	alignmentType: string;
	label: string;
	dateRange: string;
	window: string;
	/** ISO instant of the window start (the solver's ~1-hour grid point). The
	 *  countdown uses it; it is never shown to the minute. */
	windowStartIso: string;
	windowDescription: string;
	daysUntil: number;
}
export interface SolarAppointment {
	kind: 'solar';
	alignmentType: string;
	label: string;
	windowDescription: string;
	daysBefore: number;
	daysAfter: number;
}
export interface NoAppointment { kind: 'none'; reason: string }

export type Appointment = LunarAppointment | SolarAppointment | NoAppointment;

export function isLunar(a: AppAlignment): boolean {
	return a.type.includes('lunar');
}

/** Alignment types that name a CONDITION, not a datable appointment. The major
 *  standstill is a multi-year window whose extreme varies, so it can never be
 *  counted down to - it must not be presented as an ordinary one-night event.
 *  (Every server consumer already returns null for it; this mirrors that rule.) */
export const UNDATABLE_TYPES = ['lunar-standstill'];

export function isDatable(a: AppAlignment): boolean {
	return !UNDATABLE_TYPES.includes(a.type);
}

/** The alignment the app will count down to: a datable lunar one if the site has
 *  one, otherwise the first datable solar alignment. Data decides, not the slug.
 *  The standstill is never selected. */
export function primaryAlignment(site: AppSite): AppAlignment | undefined {
	const datable = site.alignments.filter(isDatable);
	return datable.find(isLunar) ?? datable[0];
}

export function nextAppointment(site: AppSite, now: Date = new Date()): Appointment {
	const a = primaryAlignment(site);
	if (!a) return { kind: 'none', reason: 'no alignments in canon for this site' };

	if (a.type === 'lunar-lunistice-south') {
		const lev = findNextSouthernLunistice(now, site.latitude);
		if (!lev) return { kind: 'none', reason: 'no upcoming lunistice within the search window' };
		const dateRange = lev.datetime.toLocaleDateString('en-GB', {
			weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'
		});
		return {
			kind: 'lunar',
			alignmentType: a.type,
			label: alignmentLabel(a.type),
			dateRange,
			window: lunisticeLocalWindow(lev.datetime),
			windowStartIso: lev.datetime.toISOString(),
			windowDescription:
				`${alignmentLabel(a.type)} — the moon reaches its most southerly declination of the month ` +
				`(${lev.declinationDeg.toFixed(1)}°) and rises ${terrainLine(site.slug)}. ` +
				`Time is approximate to within about an hour. Moon phase: ${lev.phaseBand}.`,
			daysUntil: lev.daysUntil
		};
	}

	if (isLunar(a)) {
		// A lunar alignment the app has no datable calculation for (e.g. a
		// standstill-type record that slipped through). Say so; invent nothing.
		return { kind: 'none', reason: `${a.type} is a condition rather than a datable appointment` };
	}

	// Solar: rendered from generated data. The window is the site's own geometry;
	// the exact date/time needs the solar solver, which is not client-side yet.
	return {
		kind: 'solar',
		alignmentType: a.type,
		label: alignmentLabel(a.type),
		windowDescription:
			`${alignmentLabel(a.type)} — the setting/rising point sits at bearing ${a.bearing}° true, ` +
			`horizon ${a.horizonAltitude}°. Alignment visible from ${a.daysBefore} day${a.daysBefore === 1 ? '' : 's'} ` +
			`before to ${a.daysAfter} day${a.daysAfter === 1 ? '' : 's'} after the solstice.`,
		daysBefore: a.daysBefore,
		daysAfter: a.daysAfter
	};
}
