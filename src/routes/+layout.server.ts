import { sites } from '$lib/server/sites';

export interface LayoutData {
	canonSize: {
		total: number;
		surveyed: number;
		traditional: number;
	};
}

export function load(): LayoutData {
	return {
		canonSize: {
			total: sites.length,
			surveyed: sites.filter(s => s.tier === 'surveyed').length,
			traditional: sites.filter(s => s.tier === 'traditional').length
		}
	};
}