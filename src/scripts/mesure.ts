/*
 * Mesure d'audience minimale et pixel Meta.
 *
 * Visites : un POST anonyme vers le Sheet, une seule fois par session :
 * date, type d'appareil, page de provenance, campagne UTM. Pas d'IP côté
 * feuille, pas de cookie, pas d'identifiant : on compte, c'est tout.
 *
 * Pixel Meta : uniquement si LIVE.META_PIXEL_ID est renseigné ET après un
 * « J'accepte » sur la bannière. L'inscription envoie l'événement Lead
 * (voir marquerInscrit dans etat.ts).
 */
import { LIVE } from '../config/live';

/* ---------- Compter les visites, sans rien pister ---------- */
{
	let deja = false;
	try {
		deja = !!sessionStorage.getItem('lnb-visite');
		sessionStorage.setItem('lnb-visite', '1');
	} catch {
		/* navigation privée stricte : on comptera cette visite deux fois, tant pis */
	}
	if (!deja) {
		fetch('/api/inscription', {
			method: 'POST',
			keepalive: true,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				etape: 'visite',
				appareil: matchMedia('(pointer: coarse)').matches ? 'mobile' : 'ordinateur',
				provenance: document.referrer || '',
				utm: (location.search.match(/utm_[^&]+/g) || []).join(' ')
			})
		}).catch(() => {});
	}
}

/* ---------- Pixel Meta, uniquement si configuré ET consenti ---------- */
if (LIVE.META_PIXEL_ID) {
	const CLE = 'lnb-consent-pixel';
	let choix: string | null = null;
	try {
		choix = localStorage.getItem(CLE);
	} catch {}

	function chargerPixel() {
		if (window.fbq) return;
		// Amorce officielle de Meta : file d'attente jusqu'au chargement de fbevents.js
		const w = window as unknown as Record<string, unknown>;
		const n = function (this: unknown, ...args: unknown[]) {
			n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
		} as unknown as { (...args: unknown[]): void; callMethod?: (...a: unknown[]) => void; queue: unknown[]; push: unknown; loaded: boolean; version: string };
		n.push = n;
		n.loaded = true;
		n.version = '2.0';
		n.queue = [];
		w.fbq = n;
		w._fbq = n;
		const s = document.createElement('script');
		s.async = true;
		s.src = 'https://connect.facebook.net/en_US/fbevents.js';
		document.head.appendChild(s);
		n('init', LIVE.META_PIXEL_ID);
		n('track', 'PageView');
	}

	// La politique de confidentialité doit dire la vérité : si le pixel est
	// configuré, le paragraphe « aucun cookie » est remplacé.
	const paragrapheCookies = document.getElementById('texte-cookies');
	if (paragrapheCookies) {
		paragrapheCookies.textContent =
			"Avec ton accord explicite (bannière en bas de page), cette page utilise le pixel Meta, un traceur de la société Meta Platforms Ireland Ltd, afin de mesurer les visites et de proposer des publicités pertinentes sur Facebook et Instagram. Il dépose des cookies et transmet des données de navigation à Meta, y compris hors Union européenne. Sans ton accord, aucun traceur n'est chargé et ta visite reste anonyme. Tu peux retirer ton accord à tout moment en effaçant les cookies de ton navigateur.";
	}

	if (choix === 'oui') {
		chargerPixel();
	} else if (choix !== 'non') {
		const b = document.createElement('div');
		b.className = 'bandeau-consent';
		b.setAttribute('role', 'dialog');
		b.setAttribute('aria-label', 'Consentement aux cookies');
		b.innerHTML =
			"<p>Avec ton accord, on utilise un traceur Meta pour te reproposer ce live si tu pars sans t'inscrire. <a href=\"#\" data-ouvre-legal>En savoir plus</a></p>" +
			'<div class="consent-boutons"><button type="button" class="consent-non">Non merci</button>' +
			'<button type="button" class="consent-oui">J\'accepte</button></div>';
		document.body.appendChild(b);

		b.querySelector('.consent-oui')!.addEventListener('click', () => {
			try {
				localStorage.setItem(CLE, 'oui');
			} catch {}
			chargerPixel();
			b.remove();
		});
		b.querySelector('.consent-non')!.addEventListener('click', () => {
			try {
				localStorage.setItem(CLE, 'non');
			} catch {}
			b.remove();
		});
	}
}
