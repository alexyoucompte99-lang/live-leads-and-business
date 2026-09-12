# Live Leads and Business · page d'inscription

Page d'inscription au coaching business hebdomadaire de Lucas, pour les dirigeants d'agence et les entrepreneurs. Même architecture que [Free-Formation-Janvier-26](https://github.com/0xMazout/Free-Formation-Janvier-26) : Astro 5 en mode serveur (adaptateur Node), conteneurisé et hébergé sur le Coolify de LNB (c.lnb.ad).

## Lancer

```bash
npm install
cp .env.example .env   # WEBHOOK_URL : l'Apps Script du Sheet
npm run dev            # http://localhost:4321
npm run build          # vérifie avant de pousser
```

Sans `WEBHOOK_URL`, rien n'est envoyé au Sheet : la route `/api/inscription` répond `{ ok: true, simule: true }` et logue les données dans la console.

## Chaque semaine : changer la date

Tout est dans `src/config/live.ts`. Pour la session suivante, change `DATE`, `DATE_COURTE`, `JOUR`, `DATE_ISO` et `REPONSE_AVANT`. Le compte à rebours, l'agenda, les textes datés et la clé `session` envoyée au Sheet en découlent.

Autres réglages du même fichier :

| Clé | Rôle | Vide = |
| --- | --- | --- |
| `WHATSAPP_URL` | Lien d'invitation du groupe WhatsApp, proposé après l'inscription (confirmation et popup de sortie) | bloc masqué |
| `VISIO_URL` | Lien Zoom / Meet affiché sur la confirmation | « le lien arrive sur WhatsApp » |
| `APPEL_URL` | Prise de rendez-vous avec l'équipe | blocs « et après » masqués |
| `META_PIXEL_ID` | Pixel Meta, chargé seulement après consentement | aucun pixel, aucune bannière |
| `TEMOIGNAGES` | Vidéos de la section preuves | section vidéos masquée |

Sur Coolify, `WEBHOOK_URL` est définie dans les variables d'environnement de l'application. Elle n'apparaît jamais dans le HTML.

## Ce que fait la page

- **Compte à rebours** jours / heures / minutes / secondes dans le hero (`src/components/Countdown.astro`), passe en « En direct maintenant » à l'heure du live.
- **Deux CTA** : « Me faire coacher » et « Assister au live ». Chacun présélectionne le mode dans le formulaire et adapte le libellé du bouton.
- **Formulaire en trois écrans** (`src/components/Inscription.astro`) : coordonnées + mode → candidature au coaching (si choisie) → confirmation avec le **groupe WhatsApp** en premier, puis l'agenda. Un échec d'enregistrement affiche une erreur et n'avance pas.
- **Popup de sortie** (`src/components/ExitPopup.astro`) : sur ordinateur quand la souris quitte la fenêtre par le haut, sur mobile lors d'une remontée rapide après avoir lu un tiers de la page. Une fois par chargement de page, jamais après une inscription, jamais pendant la saisie d'un champ. Contient un mini-formulaire (prénom, e-mail, WhatsApp) qui enregistre une inscription « assister », puis propose le groupe WhatsApp.
- **Relais serveur** `src/pages/api/inscription.ts` : reçoit les POST du navigateur, valide, répond immédiatement, puis reposte à l'Apps Script en arrière-plan. **Une ligne par personne** : l'inscription en mode coaching est retenue jusqu'à 20 min (`ATTENTE_CANDIDATURE_MS`) en attendant la candidature, qui part seule avec tous les champs ; sans candidature, l'inscription part telle quelle. Relances 2 s, 8 s, 30 s si Google est injoignable, jamais après un timeout (la ligne est déjà écrite). Un échec définitif est logué avec la charge complète dans les logs Coolify (`[inscription] PERDU`), pour ressaisie.

## Correspondance avec le Sheet

Les questions de candidature ont changé, pas l'Apps Script ni les colonnes. Les clés envoyées restent celles d'avant :

| Clé envoyée | Question posée |
| --- | --- |
| `profil` | Quelle situation te correspond aujourd'hui ? |
| `business` | Que vends-tu, à qui, et comment travailles-tu aujourd'hui ? |
| `blocage1` | Quel problème veux-tu travailler pendant le live ? |
| `blocage2` | Qu'as-tu déjà essayé pour résoudre ce problème ? |
| `blocage3` | toujours vide (question supprimée) |
| `objectif` | À la fin du coaching, qu'aimerais-tu avoir clarifié ou décidé ? |
| `ca` | CA mensuel moyen HT, facultatif |

Le champ `source` vaut `lp-live-lnb-v2`, suivi des UTM et de ` · popup-sortie` pour les inscriptions faites depuis la popup.

## Avant diffusion

- Renseigner `WHATSAPP_URL`.
- Compléter les mentions légales : chercher `aremplir` dans `src/components/Legal.astro`.
- Les chiffres de la section preuves (200+, 2,3 M€, 96 %) viennent de l'ancienne page : ne garder que ceux dont la source et le calcul sont explicables.

## Structure

```
src/
  config/live.ts          date, liens, témoignages (importé côté client, aucun secret)
  layouts/BaseLayout.astro
  styles/global.css       toute la DA (fond #060a04, vert #a6ff4d, Instrument Serif + Geist)
  scripts/etat.ts         état partagé : données du formulaire, envoi, validation
  scripts/motion.ts       voile, particules, halo, révélations, barre CTA
  scripts/mesure.ts       compteur de visites anonyme, pixel Meta sous consentement
  components/             Hero, PourQui, Deroule, MotDeLucas, Preuves, EtApres,
                          Inscription, Countdown, WhatsAppCard, ExitPopup, BarreCta, Legal
  pages/index.astro
  pages/api/inscription.ts
```

## Déploiement

Coolify (https://c.lnb.ad) déploie la branche `main` du dépôt GitHub avec le `Dockerfile` (build pack Dockerfile, port 4321). Chaque push sur `main` redéploie. Pour reconstruire à la main : bouton « Redeploy » dans l'application Coolify.
