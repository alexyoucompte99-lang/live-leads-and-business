/// <reference types="astro/client" />

interface ImportMetaEnv {
	/** URL de l'Apps Script qui écrit dans le Sheet. Serveur uniquement. */
	readonly WEBHOOK_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
