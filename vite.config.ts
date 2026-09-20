import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Per-BUILD id, used to version the service-worker URL (/sw.js?v=<id>). It must
// change on every deploy, or a browser keeps the previous worker and a worker fix
// never reaches the device. Netlify supplies COMMIT_REF; locally we use the git
// SHA; a timestamp is the last resort.
function buildId(): string {
	if (process.env.COMMIT_REF) return String(process.env.COMMIT_REF).slice(0, 12);
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
	} catch {
		return String(Date.now());
	}
}

const BUILD_ID = buildId();

export default defineConfig({
	// Build-time flags.
	//   __SW_ENABLED__ false (the default) makes the whole service-worker
	//   registration branch unreachable, so it is eliminated from the bundle -
	//   not merely skipped at runtime. See scripts/verify-prod-bundle.ts.
	//   __BUILD_ID__ versions the worker URL per deploy.
	define: {
		__SW_ENABLED__: JSON.stringify(process.env.PUBLIC_SW_ENABLED === 'true'),
		__BUILD_ID__: JSON.stringify(BUILD_ID)
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
