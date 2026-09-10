/* =====================================================================
   CONFIG DU LIVE : la seule zone à modifier d'une semaine sur l'autre.

   Le live est hebdomadaire. Pour la session suivante, change DATE,
   DATE_COURTE, JOUR, DATE_ISO et REPONSE_AVANT, rien d'autre : le compte à
   rebours, l'agenda, la « session » envoyée au Sheet et tous les textes
   datés en découlent.

   Ce fichier est importé côté client : ne mets JAMAIS de secret ici.
   L'URL du webhook Apps Script vit dans la variable d'environnement
   WEBHOOK_URL, lue uniquement par src/pages/api/inscription.ts.
===================================================================== */

export const LIVE = {
	DATE: 'Mardi 15 septembre',
	DATE_COURTE: 'Live · 15 septembre',
	JOUR: 'mardi',
	HEURE: '17h00',
	DATE_ISO: '2026-09-15T17:00:00+02:00',
	DUREE_MIN: 60,
	/** Échéance annoncée aux candidats pour la réponse de sélection. */
	REPONSE_AVANT: 'lundi 14 septembre',

	TITRE_AGENDA: 'Coaching business en direct · Leads and Business',
	DETAILS_AGENDA:
		"Chaque semaine, Lucas Fabre coache en direct des dirigeants d'agence et des entrepreneurs sur le vrai blocage de leur activité, puis répond à tes questions.\n\nLe lien de connexion arrive sur WhatsApp et par e-mail juste avant le début.",

	/** Lien Zoom / Meet du live. Vide = la confirmation dit que le lien arrive sur WhatsApp. */
	VISIO_URL: '',
	VISIO_LABEL: 'Rejoindre le live',

	/**
	 * Groupe WhatsApp des participants. Proposé juste après l'inscription
	 * (écran de confirmation et popup de sortie). Vide = bloc masqué.
	 * Format : https://chat.whatsapp.com/XXXXXXXXXXXXXXXXXXXXXX
	 */
	WHATSAPP_URL: '',

	/** Prise de rendez-vous avec l'équipe (iClosed). Vide = bloc « et après » masqué. */
	APPEL_URL: 'https://app.iclosed.io/e/lucasfabre/session-eval-mentorat',

	/** Pixel Meta pour le retargeting. Vide = aucun pixel, aucune bannière. */
	META_PIXEL_ID: '',

	/** Identifiant de la source envoyé au Sheet, complété par les UTM. */
	SOURCE: 'lp-live-lnb-v2'
} as const;

export type Temoignage = {
	prenom: string;
	role: string;
	resultat: string;
	url: string;
	poster: string;
};

export const TEMOIGNAGES: Temoignage[] = [
	{ prenom: 'Thibault', role: 'Creative developer · CEO Pasokon Studio', resultat: 'De 0 lead à 3 missions à +550 €/j', url: 'https://media.shoutout.io/media/ugc/processed_video_BmxsqD8.mp4', poster: '/assets/poster-thibault.jpg' },
	{ prenom: 'David', role: 'CEO agence créative', resultat: 'Studio lancé en 2 mois · missions à +500 €/j', url: 'https://media.shoutout.io/media/ugc/processed_video_XHW8ZZ8.mp4', poster: '/assets/poster-david.jpg' },
	{ prenom: 'Jérémie', role: 'Senior frontend dev · DA', resultat: 'TJM 630 € · 3+ missions', url: 'https://media.shoutout.io/media/ugc/processed_video_fCLoyn6.mp4', poster: '/assets/poster-jeremie.jpg' },
	{ prenom: 'Alexandre', role: 'Développeur mobile', resultat: '1 an signé à 550 €/j', url: 'https://media.shoutout.io/media/ugc/processed_video_jkECNRM.mp4', poster: '/assets/poster-alexandre.jpg' }
];

/** Clé de session envoyée au Sheet : une ligne par personne et par session. */
export const SESSION = LIVE.DATE_ISO.slice(0, 10);

/** « mardi 15 septembre à 17h00 » */
export const QUAND = LIVE.DATE.charAt(0).toLowerCase() + LIVE.DATE.slice(1) + ' à ' + LIVE.HEURE;
