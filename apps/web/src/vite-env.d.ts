/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Published aperture package id on devnet (overrides the baked-in default). */
	readonly VITE_APERTURE_PACKAGE_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
