import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Build-time flags. PUBLIC_SW_ENABLED=false (the default) makes the whole
	// service-worker registration branch unreachable, so it is eliminated from the
	// bundle — not merely skipped at runtime. See scripts/verify-prod-bundle.ts.
	define: {
		__SW_ENABLED__: JSON.stringify(process.env.PUBLIC_SW_ENABLED === 'true')
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});