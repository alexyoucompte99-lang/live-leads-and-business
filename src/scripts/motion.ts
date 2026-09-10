/*
 * Tout le motion de la page : voile d'ouverture, particules, halo du
 * curseur, lettres et citation, révélations au scroll, boutons magnétiques,
 * cartes inclinables, jauge, fil et barre CTA.
 */
import { $, mouvementReduit, pointeurFin } from './etat';

/* ---------- Le voile d'ouverture, puis l'entrée du hero ---------- */
function ouvrir() {
	$('voile').classList.add('leve');
	$('hero').classList.add('joue');
}
window.addEventListener('load', ouvrir);
// Filet de sécurité : si `load` traîne (polices lentes), on ouvre quand même
setTimeout(ouvrir, 1600);

/* ---------- Découpe des petits labels en lettres ---------- */
if (!mouvementReduit) {
	document.querySelectorAll<HTMLElement>('[data-lettres]').forEach((el) => {
		const texte = el.textContent || '';
		el.textContent = '';
		[...texte].forEach((c, i) => {
			if (c === ' ') {
				el.appendChild(document.createTextNode(' '));
				return;
			}
			const s = document.createElement('span');
			s.className = 'l';
			s.textContent = c;
			s.style.transitionDelay = i * 34 + 'ms';
			el.appendChild(s);
		});
	});
}

/* ---------- Citation : révélation mot à mot ---------- */
if (!mouvementReduit) {
	const citation = document.querySelector('.citation');
	let index = 0;
	function decouper(noeud: Node) {
		Array.from(noeud.childNodes).forEach((enfant) => {
			if (enfant.nodeType === Node.TEXT_NODE) {
				const fragment = document.createDocumentFragment();
				(enfant.textContent || '').split(/(\s+)/).forEach((morceau) => {
					if (/^\s*$/.test(morceau)) {
						fragment.appendChild(document.createTextNode(morceau));
					} else {
						const span = document.createElement('span');
						span.className = 'mot-a-mot';
						span.textContent = morceau;
						span.style.transitionDelay = index * 52 + 'ms';
						index++;
						fragment.appendChild(span);
					}
				});
				noeud.replaceChild(fragment, enfant);
			} else if (enfant.nodeType === Node.ELEMENT_NODE) {
				decouper(enfant);
			}
		});
	}
	if (citation) decouper(citation);
}

/* ---------- Les particules ---------- */
if (!mouvementReduit) {
	const ciel = $('poussieres');
	for (let i = 0; i < 10; i++) {
		const p = document.createElement('span');
		p.className = 'poussiere';
		p.style.left = Math.random() * 100 + 'vw';
		p.style.top = 55 + Math.random() * 45 + 'vh';
		p.style.animationDuration = 16 + Math.random() * 16 + 's';
		p.style.animationDelay = -Math.random() * 20 + 's';
		p.style.transform = 'scale(' + (0.6 + Math.random() * 0.8) + ')';
		ciel.appendChild(p);
	}
}

/* ---------- Révélations au scroll ---------- */
{
	const cibles = document.querySelectorAll('.reveal, .courbe, .etape, .titre-section, .pour-qui li, .note, .citation');
	if (mouvementReduit || !('IntersectionObserver' in window)) {
		cibles.forEach((el) => el.classList.add('vu'));
	} else {
		const observateur = new IntersectionObserver(
			(entrees) => {
				entrees.forEach((e) => {
					if (!e.isIntersecting) return;
					e.target.classList.add('vu');
					observateur.unobserve(e.target);
				});
			},
			{ threshold: 0.16, rootMargin: '0px 0px -6% 0px' }
		);
		// Décalage en cascade entre voisins d'un même groupe
		document.querySelectorAll<HTMLElement>('.pour-qui li, .deroule .etape').forEach((el, i) => {
			el.style.transitionDelay = (i % 3) * 0.11 + 's';
		});
		cibles.forEach((el) => observateur.observe(el));
	}
}

/* ---------- Onde au clic sur les boutons ---------- */
document.querySelectorAll<HTMLElement>('.cta').forEach((btn) => {
	btn.addEventListener('click', (e) => {
		if (mouvementReduit) return;
		const r = btn.getBoundingClientRect();
		const o = document.createElement('span');
		o.className = 'ondulation';
		o.style.left = e.clientX - r.left + 'px';
		o.style.top = e.clientY - r.top + 'px';
		btn.appendChild(o);
		o.addEventListener('animationend', () => o.remove(), { once: true });
	});
});

/* ---------- Boutons magnétiques et cartes qui s'inclinent (desktop) ---------- */
if (!mouvementReduit && pointeurFin) {
	document.querySelectorAll<HTMLElement>('[data-magnetique]').forEach((btn) => {
		btn.addEventListener('pointermove', (e) => {
			const r = btn.getBoundingClientRect();
			const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
			const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
			btn.style.transform = 'translate(' + (dx * 9).toFixed(1) + 'px, ' + (dy * 6 - 2).toFixed(1) + 'px)';
		});
		btn.addEventListener('pointerleave', () => {
			btn.style.transform = '';
		});
	});

	document.querySelectorAll<HTMLElement>('.inclinable').forEach((carte) => {
		carte.addEventListener('pointermove', (e) => {
			const r = carte.getBoundingClientRect();
			const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
			const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
			carte.style.transition = 'transform 0.18s ease-out';
			carte.style.transform = 'perspective(1000px) rotateY(' + (dx * 3).toFixed(2) + 'deg) rotateX(' + (-dy * 2.4).toFixed(2) + 'deg)';
		});
		carte.addEventListener('pointerleave', () => {
			carte.style.transition = '';
			carte.style.transform = '';
		});
	});
}

/* ---------- Le halo qui suit le curseur ---------- */
if (!mouvementReduit && pointeurFin) {
	const halo = $('halo-curseur');
	let cibleX = window.innerWidth / 2;
	let cibleY = window.innerHeight * 0.3;
	let x = cibleX;
	let y = cibleY;
	let anime = false;

	function suivre() {
		x += (cibleX - x) * 0.06;
		y += (cibleY - y) * 0.06;
		halo.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
		if (Math.abs(cibleX - x) > 0.5 || Math.abs(cibleY - y) > 0.5) {
			requestAnimationFrame(suivre);
		} else {
			anime = false;
		}
	}

	window.addEventListener(
		'pointermove',
		(e) => {
			cibleX = e.clientX;
			cibleY = e.clientY;
			halo.classList.add('actif');
			if (!anime) {
				anime = true;
				requestAnimationFrame(suivre);
			}
		},
		{ passive: true }
	);
}

/* ---------- Boucle de scroll : jauge, fil, parallaxe, barre CTA ---------- */
{
	const jauge = $('jauge');
	const fil = $('fil');
	const globe = $('souffle');
	const page = document.querySelector<HTMLElement>('.page')!;
	const barre = $('barre');
	const hero = $('hero');
	const carte = $('inscription');
	let enAttente = false;

	function dessiner() {
		const y = window.scrollY;

		if (!mouvementReduit) {
			const total = document.documentElement.scrollHeight - window.innerHeight;
			jauge.style.transform = 'scaleX(' + (total > 0 ? Math.min(1, y / total) : 0) + ')';

			const debut = 470;
			const fin = page.offsetHeight - 60;
			const repere = y + window.innerHeight * 0.74 - page.offsetTop;
			fil.style.height = Math.max(0, Math.min(repere - debut, fin - debut)) + 'px';

			// Parallaxe : le globe descend moins vite que le texte
			if (y < window.innerHeight * 1.3) {
				globe.style.transform = 'translate(-50%, calc(-50% + ' + (y * 0.16).toFixed(1) + 'px))';
			}
		}

		// La barre apparaît une fois le hero passé, et s'efface devant le formulaire
		const heroFini = y > hero.offsetTop + hero.offsetHeight - 60;
		const carteVisible = carte.getBoundingClientRect().top < window.innerHeight * 0.85;
		barre.classList.toggle('montre', heroFini && !carteVisible);

		enAttente = false;
	}

	window.addEventListener(
		'scroll',
		() => {
			if (!enAttente) {
				enAttente = true;
				requestAnimationFrame(dessiner);
			}
		},
		{ passive: true }
	);
	window.addEventListener('resize', dessiner);
	dessiner();
}
