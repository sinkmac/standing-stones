import { sites } from '$lib/server/sites';
import { isSolarAlignment } from '$lib/server/sites';
import { calculateNextAlignment } from '$lib/server/alignments';
import { calculateNextLunarLunistice } from '$lib/lunarLunistice';
import { fieldGuideSites } from '$lib/fieldGuideData';

interface CountdownInfo {
	slug: string;
	days: number | null;
	label: string;
	date: string;
}

export interface HomePageData {
	sites: typeof fieldGuideSites;
	countdowns: CountdownInfo[];
	canon: Record<string, { latitude: number; longitude: number; approach: string; description: string }>;
}

function nextAlignmentDate(
	latitude: number,
	longitude: number,
	alignments: (typeof sites)[number]['alignments'],
	tier: (typeof sites)[number]['tier'],
	now: Date
): { date: Date; label: string } | null {
	let best: { date: Date; label: string } | null = null;
	for (const a of alignments) {
		if (!isSolarAlignment(a)) continue;
		const ev = calculateNextAlignment(latitude, longitude, a.bearing, a.event, a.type, tier, now);
		if (!ev) continue;
		const d = ev.solsticeDate;
		if (!best || d.getTime() < best.date.getTime()) {
			best = { date: d, label: a.event === 'sunrise' ? 'Sunrise' : 'Sunset' };
		}
	}
	if (!best) {
		// Lunar-only site (Callanish): next southern lunistice
		const lev = calculateNextLunarLunistice(now, latitude);
		if (lev) return { date: lev.datetime, label: 'Moonrise' };
	}
	return best;
}

export async function load(): Promise<HomePageData> {
	const now = new Date();
	const countdowns: CountdownInfo[] = [];

	for (const fg of fieldGuideSites) {
		const canon = sites.find((s) => s.slug === fg.slug);
		if (!canon) continue;
		const ev = nextAlignmentDate(canon.latitude, canon.longitude, canon.alignments, canon.tier, now);
		if (ev) {
			const diff = ev.date.getTime() - now.getTime();
			const days = Math.max(0, Math.ceil(diff / 86400000));
			countdowns.push({
				slug: fg.slug,
				days,
				label: ev.label,
				date: ev.date.toISOString().slice(0, 10),
			});
		} else {
			countdowns.push({ slug: fg.slug, days: null, label: '—', date: '—' });
		}
	}

	return {
		sites: fieldGuideSites,
		countdowns,
		canon: Object.fromEntries(
			sites.map((s) => [
				s.slug,
				{
					latitude: s.latitude,
					longitude: s.longitude,
					approach: s.enrichment?.approach ?? '',
					description: s.description,
				},
			])
		),
	};
}
