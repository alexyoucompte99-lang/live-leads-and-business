import type { APIRoute } from 'astro';
import { setTimeout as attendre } from 'node:timers/promises';

export const prerender = false;

/*
 * Relais vers l'Apps Script « Live Leads and Business · Inscriptions ».
 *
 * Le navigateur poste ici ; le serveur valide, répond tout de suite, puis
 * reposte au Sheet en arrière-plan. L'Apps Script met 2 s à répondre : on
 * ne fait pas attendre le visiteur pour ça.
 *
 * En contrepartie, un échec d'écriture n'est plus visible du visiteur : il
 * est rejoué trois fois (2 s, 8 s, 30 s) puis, s'il échoue encore, logué
 * avec la charge complète dans les logs du conteneur (Coolify → Logs),
 * pour ressaisie à la main. Apps Script répond 200 même quand il plante,
 * avec une page HTML au lieu de `{"ok":true}` : on vérifie le JSON.
 *
 * Le processus Node reste vivant après la réponse (adaptateur standalone),
 * les tâches de fond se terminent normalement.
 *
 * Étapes acceptées : visite, inscription, candidature_live.
 * Les clés envoyées au Sheet restent celles du script existant (profil,
 * business, blocage1, blocage2, blocage3, objectif, ca…) : le formulaire
 * a changé de questions, pas le tableur. Voir src/scripts/etat.ts.
 */

const ETAPES: Record<string, true> = { visite: true, inscription: true, candidature_live: true };
const WEBHOOK_URL = import.meta.env.WEBHOOK_URL ?? '';
const DELAIS_MS = [0, 2000, 8000, 30000];

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function posterAuSheet(donnees: Record<string, unknown>): Promise<string | null> {
	const reponse = await fetch(WEBHOOK_URL, {
		method: 'POST',
		redirect: 'follow',
		headers: { 'Content-Type': 'text/plain;charset=utf-8' },
		body: JSON.stringify(donnees),
		signal: AbortSignal.timeout(20000)
	});
	const texte = await reponse.text();
	let corps: { ok?: unknown } | null = null;
	try {
		corps = JSON.parse(texte);
	} catch {}
	if (!reponse.ok || !corps || corps.ok === false) return reponse.status + ' ' + texte.slice(0, 300);
	return null;
}

async function relayerEnArrierePlan(donnees: Record<string, unknown>) {
	for (let essai = 0; essai < DELAIS_MS.length; essai++) {
		if (DELAIS_MS[essai]) await attendre(DELAIS_MS[essai]);
		try {
			const erreur = await posterAuSheet(donnees);
			if (!erreur) return;
			console.error(`[inscription] Apps Script a échoué (essai ${essai + 1}) :`, erreur);
		} catch (err) {
			console.error(`[inscription] Envoi échoué (essai ${essai + 1}) :`, err);
		}
	}
	console.error('[inscription] PERDU après ' + DELAIS_MS.length + ' essais, à ressaisir :', JSON.stringify(donnees));
}

export const POST: APIRoute = async ({ request }) => {
	let donnees: Record<string, unknown>;
	try {
		donnees = await request.json();
	} catch {
		return json({ ok: false, erreur: 'JSON invalide' }, 400);
	}

	const etape = typeof donnees.etape === 'string' ? donnees.etape : '';
	if (!ETAPES[etape]) return json({ ok: false, erreur: 'Étape inconnue' }, 400);

	if (etape !== 'visite') {
		const email = typeof donnees.email === 'string' ? donnees.email.trim() : '';
		const prenom = typeof donnees.prenom === 'string' ? donnees.prenom.trim() : '';
		if (prenom.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return json({ ok: false, erreur: 'Prénom ou e-mail manquant' }, 400);
		}
	}

	donnees.horodateur = new Date().toISOString();

	if (!WEBHOOK_URL) {
		console.warn('[inscription] WEBHOOK_URL absente, données non envoyées :', donnees);
		return json({ ok: true, simule: true });
	}

	void relayerEnArrierePlan(donnees);
	return json({ ok: true });
};
