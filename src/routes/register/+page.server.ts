import { sites, type Site } from '$lib/server/sites';
import { getAllVigils, type VigilEntry } from '$lib/server/vigil';

export interface RegisterPageData {
	sites: Site[];
	recentVigils: VigilEntry[];
}

export async function load(): Promise<RegisterPageData> {
	const recentVigils = await getAllVigils();
	return {
		sites,
		recentVigils: recentVigils.slice(0, 20)
	};
}