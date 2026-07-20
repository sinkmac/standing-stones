import { sites, type Site } from '$lib/server/sites';

export interface HomePageData {
	sites: Site[];
	canonInfo: {
		total: number;
		surveyed: number;
		traditional: number;
	};
}

export function load(): HomePageData {
	return {
		sites,
		canonInfo: {
			total: sites.length,
			surveyed: sites.filter(s => s.tier === 'surveyed').length,
			traditional: sites.filter(s => s.tier === 'traditional').length
		}
	};
}