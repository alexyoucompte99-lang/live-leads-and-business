/*
 * État partagé entre les scripts de la page (formulaire, popup de sortie,
 * barre CTA). Module ES : une seule instance par page, importée partout.
 */
import { LIVE, SESSION } from '../config/live';

export const $ = (id: string) => document.getElementById(id) as HTMLElement;
export const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const pointeurFin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const utm = (location.search.match(/utm_[^&]+/g) || []).join(' ');

/**
 * Ce qui part au Sheet. Les clés sont celles de l'Apps Script existant :
 * le formulaire a changé de questions, pas le tableur. Correspondance :
 *   profil   ← « Quelle situation te correspond aujourd'hui ? »
 *   business ← « Que vends-tu, à qui, et comment travailles-tu ? »
 *   blocage1 ← « Quel problème veux-tu travailler pendant le live ? »
 *   blocage2 ← « Qu'as-tu déjà essayé ? »
 *   blocage3 ← toujours vide (question supprimée)
 *   objectif ← « À la fin du coaching, qu'aimerais-tu avoir clarifié ? »
 */
export const donnees = {
	etape: '',
	session: SESSION,
	prenom: '',
	email: '',
	tel: '',
	mode: '',
	profil: '',
	business: '',
	blocage1: '',
	blocage2: '',
	blocage3: '',
	objectif: '',
	ca: '',
	accord: false,
	droits: false,
	source: LIVE.SOURCE + (utm ? ' · ' + utm : '')
};

/** Vrai dès qu'une inscription a été enregistrée (formulaire ou popup). */
export let inscrit = false;

export function marquerInscrit() {
	inscrit = true;
	try {
		sessionStorage.setItem('lnb-inscrit', '1');
	} catch {}
	document.dispatchEvent(new CustomEvent('lnb:inscrit'));
	if (window.fbq) window.fbq('track', 'Lead');
}

try {
	if (sessionStorage.getItem('lnb-inscrit')) inscrit = true;
} catch {}

/** Envoie l'étape au Sheet via /api/inscription. Résout `true` si enregistré. */
export async function envoyer(etape: 'inscription' | 'candidature_live'): Promise<boolean> {
	donnees.etape = etape;
	try {
		const r = await fetch('/api/inscription', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(donnees)
		});
		return r.ok;
	} catch (err) {
		console.error('Envoi échoué :', err);
		return false;
	}
}

/** Marque un champ en erreur (tremblement) ; renvoie `true` si le champ est valide. */
export function marquerErreur(idChamp: string, enErreur: boolean): boolean {
	const el = $(idChamp);
	el.classList.remove('invalide');
	if (enErreur) {
		void el.offsetWidth;
		el.classList.add('invalide');
	}
	return !enErreur;
}

export const emailValide = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const telValide = (tel: string) => tel.replace(/\D/g, '').length >= 9;

declare global {
	interface Window {
		fbq?: (...args: unknown[]) => void;
	}
}
