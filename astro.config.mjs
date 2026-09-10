// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Même architecture que Free-Formation-Janvier-26 : Astro en mode serveur,
// adaptateur Node autonome, conteneurisé par le Dockerfile et hébergé sur le
// Coolify de LNB (c.lnb.ad). Le rendu serveur sert uniquement à la route
// /api/inscription, qui relaie les formulaires vers le Google Sheet sans
// exposer l'URL du webhook.
export default defineConfig({
	output: 'server',
	adapter: node({ mode: 'standalone' })
});
