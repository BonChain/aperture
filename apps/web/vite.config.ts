import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	// The fastcrypto WASM bindings (`@contra/bulletproofs-wasm`, pulled in by
	// ts-sdk in later stories) ship a modern wasm-pack `web` build. Bump the
	// target past Vite's default so its output passes through instead of
	// erroring on newer syntax. (Inherited from the kaisho base — do not remove;
	// the dlog worker depends on it once crypto is wired.)
	build: {
		target: 'es2022',
	},
	// tableWorker (later stories) dynamically imports ts-sdk, producing a split
	// chunk Vite's default IIFE worker output can't represent. Emit workers as
	// ES modules. (Inherited from kaisho — preserved per Story 1.0 Dev Notes.)
	worker: {
		format: 'es',
	},
	optimizeDeps: {
		exclude: ['ts-sdk', '@contra/bulletproofs-wasm'],
		esbuildOptions: { target: 'es2022' },
	},
	server: {
		host: '127.0.0.1',
		port: 5173,
		fs: {
			// Allow Vite to serve workspace files outside the app root (wasm in
			// later stories). Inherited from kaisho — preserved.
			allow: ['../..'],
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		css: true,
	},
});
