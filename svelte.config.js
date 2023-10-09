import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/kit/vite';

const dev = process.argv.includes('dev')

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte'],
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: [vitePreprocess()],

	vitePlugin: {
		inspector: true,
	},
	kit: {
		adapter: adapter({
			fallback: 'index.html',
		}),
		paths: {
			base: dev ? '' : process.env.BASE_PATH,
		}
	}
};
export default config;