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
 * UNE LIGNE PAR PERSONNE. L'Apps Script ajoute une ligne à chaque appel, il
 * ne met pas à jour. Pour qu'un candidat ne fasse pas deux lignes
 * (inscription puis candidature), l'inscription en mode « coaching » est
 * retenue ici jusqu'à l'arrivée de la candidature, qui part alors seule
 * avec tous les champs. Si la candidature n'arrive pas dans les
 * ATTENTE_CANDIDATURE_MS (20 min), l'inscription part telle quelle : le
 * téléphone est enregistré quoi qu'il arrive. À l'arrêt du processus
 * (redéploiement), tout ce qui est retenu part immédiatement.
 * Une même étape pour un même e-mail n'est envoyée qu'une fois par vie du
 * processus (double clic, retour en arrière, popup puis formulaire).
 *
 * Un échec d'écriture n'est pas visible du visiteur : il est rejoué
 * (2 s, 8 s, 30 s) puis logué avec la charge complète dans les logs du
 * conteneur (Coolify → Logs), pour ressaisie à la main. Apps Script répond
 * 200 même quand il plante, avec une page HTML au lieu de `{"ok":true}` :
 * on vérifie le JSON.
 *
 * Étapes acceptées : visite, inscription, candidature_live.
 * Les clés envoyées au Sheet restent celles du script existant (profil,
 * business, blocage1, blocage2, blocage3, objectif, ca…) : le formulaire
 * a changé de questions, pas le tableur. Voir src/scripts/etat.ts.
 */

const ETAPES: Record<string, true> = { visite: true, inscription: true, candidature_live: true };
const WEBHOOK_URL = import.meta.env.WEBHOOK_URL ?? '';
const DELAIS_MS = [0, 2000, 8000, 30000];
const ATTENTE_CANDIDATURE_MS = Number(import.meta.env.ATTENTE_CANDIDATURE_MS) || 20 * 60 * 1000;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/*
 * Apps Script exécute doPost puis redirige (302) vers script.googleusercontent.com
 * qui sert la réponse. Une fois redirigé, le script a tourné : si cette
 * seconde page répond 404 (clé de lecture expirée, ça arrive), la ligne est
 * quand même écrite. Rejouer dans ce cas créerait un doublon. On ne rejoue
 * donc que sans redirection (erreur en amont) ou sur erreur réseau/timeout.
 */
async function posterAuSheet(donnees: Record<string, unknown>): Promise<string | null> {
	const reponse = await fetch(WEBHOOK_URL, {
		method: 'POST',
		redirect: 'follow',
		headers: { 'Content-Type': 'text/plain;charset=utf-8' },
		body: JSON.stringify(donnees),
		signal: AbortSignal.timeout(60000)
	});
	const texte = await reponse.text();
	let corps: { ok?: unknown } | null = null;
	try {
		corps = JSON.parse(texte);
	} catch {}
	if (corps && corps.ok !== false) return null;
	if (reponse.redirected && reponse.status === 404) return null;
	return reponse.status + ' ' + texte.slice(0, 300);
}

/*
 * Une file par e-mail : la candidature ne doit jamais atteindre le Sheet
 * avant l'inscription (relance en cours sur la première pendant que la
 * seconde part), sinon l'ordre des lignes ment.
 */
const files = new Map<string, Promise<void>>();

function relayerEnArrierePlan(donnees: Record<string, unknown>) {
	const cle = typeof donnees.email === 'string' ? donnees.email.toLowerCase() : '';
	const precedent = files.get(cle) ?? Promise.resolve();
	const suivant = precedent.then(async () => {
		for (let essai = 0; essai < DELAIS_MS.length; essai++) {
			if (DELAIS_MS[essai]) await attendre(DELAIS_MS[essai]);
			try {
				const erreur = await posterAuSheet(donnees);
				if (!erreur) return;
				console.error(`[inscription] Apps Script a échoué (essai ${essai + 1}) :`, erreur);
			} catch (err) {
				// Délai dépassé : la requête est partie et Apps Script écrit la ligne
				// même quand sa réponse traîne (mesuré : 3 timeouts sur 3 = 3 lignes
				// écrites). Rejouer ferait un doublon. On s'arrête et on le note.
				if (err instanceof Error && err.name === 'TimeoutError') {
					console.warn('[inscription] Délai dépassé, ligne très probablement écrite, pas de relance :', JSON.stringify(donnees));
					return;
				}
				console.error(`[inscription] Envoi échoué (essai ${essai + 1}) :`, err);
			}
		}
		console.error('[inscription] PERDU après ' + DELAIS_MS.length + ' essais, à ressaisir :', JSON.stringify(donnees));
	});
	files.set(cle, suivant);
	void suivant.finally(() => {
		if (files.get(cle) === suivant) files.delete(cle);
	});
}

/* ---------- Une ligne par personne ---------- */

/** Inscriptions « coaching » retenues en attendant la candidature. */
const retenues = new Map<string, { donnees: Record<string, unknown>; minuteur: NodeJS.Timeout }>();
/** Étapes déjà parties, clé « email|session|etape », pour ne jamais renvoyer la même. */
const envoyees = new Set<string>();

function cleDe(donnees: Record<string, unknown>) {
	return String(donnees.email ?? '').toLowerCase() + '|' + String(donnees.session ?? '');
}

function expedier(donnees: Record<string, unknown>) {
	const cle = cleDe(donnees) + '|' + String(donnees.etape);
	if (envoyees.has(cle)) {
		console.warn('[inscription] Déjà envoyée, ignorée :', cle);
		return;
	}
	envoyees.add(cle);
	relayerEnArrierePlan(donnees);
}

function liberer(cle: string) {
	const retenue = retenues.get(cle);
	if (!retenue) return;
	clearTimeout(retenue.minuteur);
	retenues.delete(cle);
	expedier(retenue.donnees);
}

function router(donnees: Record<string, unknown>) {
	if (donnees.etape === 'visite') {
		relayerEnArrierePlan(donnees);
		return;
	}
	const cle = cleDe(donnees);
	if (donnees.etape === 'inscription' && donnees.mode === 'coaching') {
		const deja = retenues.get(cle);
		if (deja) clearTimeout(deja.minuteur);
		retenues.set(cle, { donnees, minuteur: setTimeout(() => liberer(cle), ATTENTE_CANDIDATURE_MS) });
		return;
	}
	if (donnees.etape === 'candidature_live') {
		const retenue = retenues.get(cle);
		if (retenue) {
			clearTimeout(retenue.minuteur);
			retenues.delete(cle);
			envoyees.add(cle + '|inscription'); // absorbée par la candidature
		}
	}
	expedier(donnees);
}

// Redéploiement : rien ne doit rester en mémoire.
let arretPrevu = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
	process.once(signal, () => {
		if (arretPrevu) return;
		arretPrevu = true;
		const cles = [...retenues.keys()];
		if (cles.length) console.warn('[inscription] Arrêt : envoi immédiat de ' + cles.length + ' inscription(s) retenue(s).');
		cles.forEach(liberer);
		void Promise.allSettled([...files.values()]).then(() => process.exit(0));
	});
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
	// Le Sheet interprète « +33… » comme une formule (#ERROR!) et « 06… »
	// comme un nombre (zéro perdu). L'apostrophe force le texte, sans s'afficher.
	if (typeof donnees.tel === 'string' && donnees.tel.trim() && !donnees.tel.startsWith("'")) donnees.tel = "'" + donnees.tel.trim();

	if (!WEBHOOK_URL) {
		console.warn('[inscription] WEBHOOK_URL absente, données non envoyées :', donnees);
		return json({ ok: true, simule: true });
	}

	router(donnees);
	return json({ ok: true });
};
