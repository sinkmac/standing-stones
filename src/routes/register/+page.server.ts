import { sites, isSolarAlignment, type Site } from '$lib/server/sites';
import { getAllVigils, type VigilEntry } from '$lib/server/vigil';
import { tallyRegister, type RegisterTally } from '$lib/registerCopy';

export interface RegisterSite {
	site: Site;
	tally: RegisterTally;
	/** What the count line says was seen: the sun at solar sites, the moon at lunar ones. */
	body: 'moon' | 'sun';
}

export interface RegisterPageData {
	registers: RegisterSite[];
	recentVigils: VigilEntry[];
}

export async function load(): Promise<RegisterPageData> {
	const all = await getAllVigils();
	const registers = sites.map((site) => {
		const primary = site.alignments[0];
		return {
			site,
			tally: tallyRegister(all.filter((e) => e.siteSlug === site.slug)),
			body: primary && !isSolarAlignment(primary) ? 'moon' as const : 'sun' as const
		};
	});
	return {
		registers,
		recentVigils: all.slice(0, 20)
	};
}
