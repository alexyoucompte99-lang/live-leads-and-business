import type { APIRoute } from 'astro';

export const prerender = false;

/*
 * Relais vers l'Apps Script « Live Leads and Business · Inscriptions ».
 *
 * Le navigateur poste ici, le serveur reposte au Sheet. Ça règle deux
 * choses par rapport à l'appel direct depuis la page :
 *  - l'échec d'écriture est enfin visible : Apps Script répond 200 même
 *    quand il plante, mais son corps contient alors une page d'erreur HTML
 *    au lieu du JSON attendu. On le détecte et on renvoie 502 au client,
 *    qui n'affiche pas la confirmation dans ce cas.
 *  - l'URL du webhook n'est plus dans le HTML public.
 *
 * Étapes acceptées : visite, inscription, candidature_live.
 * Les clés envoyées au Sheet restent celles du script existant (profil,
 * business, blocage1, blocage2, blocage3, objectif, ca…) : le formulaire
 * a changé de questions, pas le tableur. Voir src/scripts/inscription.ts.
 */

const ETAPES: Record<string, true> = { visite: true, inscription: true, candidature_live: true };
const WEBHOOK_URL = import.meta.env.WEBHOOK_URL ?? '';

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

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

	try {
		const reponse = await fetch(WEBHOOK_URL, {
			method: 'POST',
			redirect: 'follow',
			headers: { 'Content-Type': 'text/plain;charset=utf-8' },
			body: JSON.stringify(donnees)
		});
		const texte = await reponse.text();
		// En succès, le script répond `{"ok":true}` (application/json). En cas
		// de plantage, Apps Script renvoie une page HTML avec un statut 200.
		let corps: { ok?: unknown } | null = null;
		try {
			corps = JSON.parse(texte);
		} catch {}
		if (!reponse.ok || !corps || corps.ok === false) {
			console.error('[inscription] Apps Script a échoué :', reponse.status, texte.slice(0, 300));
			return json({ ok: false, erreur: 'Enregistrement impossible' }, 502);
		}
		return json({ ok: true });
	} catch (err) {
		console.error('[inscription] Envoi échoué :', err);
		return json({ ok: false, erreur: 'Enregistrement impossible' }, 502);
	}
};
