# Sentinel — Resilience Lab

Simulateur web de résilience face aux rançongiciels, destiné à un projet de **Master en Réseau et Sécurité Informatique**. Application française, avec interface SOC sombre/claire, authentification réelle et base MongoDB.

Les simulations changent exclusivement les états de ressources fictives dans **MongoDB Atlas**. Elles ne chiffrent aucun fichier hôte, ne parcourent pas le système de fichiers et n’effectuent aucun accès réseau vers les machines simulées. Les comptes, sessions, fichiers fictifs, sauvegardes, incidents et journaux de l’application sont persistés sur le cluster distant.

## Démarrage rapide

Prérequis : **Node.js 22.12+** ou 24, npm, une connexion Internet et un accès à votre cluster MongoDB Atlas. Le backend et l’interface peuvent tourner sur votre ordinateur ; la base de l’application est distante.

```powershell
npm.cmd install
npm.cmd run db:check
npm.cmd run dev
```

Sous macOS/Linux, utiliser `npm` à la place de `npm.cmd`. Sous PowerShell, `npm.cmd` évite le blocage de `npm.ps1` par la politique d’exécution Windows.

Ouvrir **http://127.0.0.1:5173**. L’API écoute sur **http://127.0.0.1:4000** et se connecte à la base **`sentinel`** dans Atlas. Le démarrage refuse toute URL manquante, incomplète ou locale. Il n’existe aucun repli vers une base locale. La commande `db:check` effectue un contrôle de connexion en lecture seule.

Au premier lancement sur une base Atlas sans laboratoire Sentinel, trois comptes de démonstration et les ressources fictives sont initialisés **dans Atlas**. Les boutons de démonstration préremplissent le formulaire ; il faut cliquer sur « Se connecter » pour ouvrir une vraie session. Un laboratoire déjà présent est conservé.

| Rôle             | Adresse e-mail         | Mot de passe initial |
| ---------------- | ---------------------- | -------------------- |
| ADMIN            | `admin@sentinel.lab`   | `Sentinel!2026`      |
| SECURITY_ANALYST | `analyst@sentinel.lab` | `Sentinel!2026`      |
| USER             | `user@sentinel.lab`    | `Sentinel!2026`      |

Ces identifiants sont destinés à la démonstration académique. En `NODE_ENV=production`, aucun compte de démonstration n’est créé et les raccourcis de connexion sont désactivés. Un changement de mot de passe ne sera pas écrasé au redémarrage.

Le fichier privé `.env` contient `MONGODB_URI`, `MONGODB_DB_NAME=sentinel` et le secret de session. Il est exclu de Git. Pour une nouvelle installation, copier `.env.example` vers `.env`, remplacer les identifiants d’exemple et utiliser un utilisateur créé dans **Atlas → Database Access**. Autoriser l’adresse IP du backend dans **Atlas → Network Access**. Ne jamais mettre ces identifiants dans une variable `VITE_*` ou dans le code React.

Les données de l’ancien dossier `.data/mongo` ne sont plus lues ni écrites par l’application. Elles ne sont pas automatiquement migrées ou effacées : Atlas constitue désormais une source distincte. Les documents du simulateur restent fictifs ; leur stockage et les opérations SHA-256 sont réels. Les tests automatisés emploient leurs propres bases jetables, jamais la base Atlas de l’application.

## Fonctionnalités

- Authentification bcrypt coût 12, JWT expirant, cookie HttpOnly/SameSite, sessions révocables en MongoDB, CSRF, origines autorisées, limitation des requêtes, validation Zod et protections Helmet.
- Trois rôles contrôlés **dans l’API** et dans les routes React. Les utilisateurs ordinaires voient seulement leurs fichiers et les systèmes associés ; les indicateurs généraux et l’état des services restent visibles.
- Dashboard avec score expliqué, graphiques de résilience/incidents, répartition des fichiers, services et activités réelles du laboratoire.
- Scénarios faible, moyen, critique et personnalisé ; choix des postes, serveurs et services. Sélection aléatoire des fichiers fictifs, création d’incident, calcul d’impact, journaux et animation pédagogique.
- Infrastructure : 8 postes, 4 serveurs, 4 services et 144 fichiers fictifs. IP dans le réseau documentaire `192.0.2.0/24`.
- Sauvegardes complètes ou partielles, instantanés indépendants, manifeste SHA-256, vérification, suppression contrôlée. Une copie volontairement altérée permet de démontrer un échec d’intégrité.
- Workflow de reprise en 9 étapes, contrôle de l’ordre côté serveur, restauration par lots, revérification avant copie et contrôle après restauration, réactivation des services et clôture.
- Plan de reprise, objectifs RTO/RPO configurables, rapports d’incident, export JSON et mise en page d’impression A4 permettant l’enregistrement PDF.
- Gestion des utilisateurs, modification des accès, désactivation des comptes non administrateurs, attribution des fichiers aux utilisateurs, modification de son mot de passe et révocation des sessions.
- Recherche, tri et pagination des tableaux, filtres, raccourci `Ctrl+K`, notifications liées aux incidents, toasts, chargements et états d’erreur, adaptation mobile et préférence de thème persistante.

## Parcours de démonstration

1. Se connecter en administrateur et présenter le dashboard initial : 144 fichiers sains, score 100, 4 services disponibles.
2. Dans **Sauvegardes**, créer une copie complète récente.
3. Dans **Vérification d’intégrité**, vérifier la copie normale, puis « Échantillon altéré · test d’intégrité » : comparer `Integrity verified` et `Integrity check failed`.
4. Dans **Simulations**, choisir un niveau ou configurer quelques fichiers sur `SERVER-FILES-01`.
5. Lancer et observer l’incident, l’impact, les services dégradés et la baisse de score.
6. Dans **Restauration**, parcourir confinement → analyse → sélection de sauvegarde → SHA-256 → restauration. Restaurer un premier lot, puis le reste pour illustrer la progression réelle.
7. Effectuer le contrôle final, réactiver les services et clôturer.
8. Ouvrir **Rapports**, comparer les scores, le taux restauré, le temps de reprise et les objectifs RTO/RPO. Utiliser **Imprimer / PDF**, puis choisir « Enregistrer au format PDF ».
9. Se connecter en analyste puis en utilisateur pour démontrer les différences de droits.

Voir [le guide de soutenance](docs/DEMONSTRATION.md) pour une présentation structurée et les limites à expliciter.

## Commandes

| Commande                              | Résultat                                                         |
| ------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                         | API avec surveillance des fichiers et frontend Vite              |
| `npm run dev:api` / `npm run dev:web` | Démarrer séparément les deux services                            |
| `npm run build`                       | Compiler le frontend dans `dist/`                                |
| `npm start`                           | API et frontend compilé servis ensemble sur le port 4000         |
| `npm run seed`                        | Initialiser seulement si le laboratoire n’existe pas             |
| `npm run db:check`                    | Vérifier la connexion Atlas sans créer de données                |
| `npm test`                            | Tests d’intégration/sécurité avec MongoDB temporaire             |
| `npm run test:e2e`                    | Tests navigateur avec base dédiée temporaire et serveur sur 4100 |
| `npm run check`                       | Compilation puis tests API                                       |

Avant `npm run test:e2e`, exécuter `npm run build`. Sous Windows les tests utilisent Microsoft Edge installé. Ailleurs, installer Chromium avec `npx playwright install chromium`. La variable `PLAYWRIGHT_CHANNEL` permet de choisir un navigateur installé, par exemple `chrome`.

Les tests navigateur produisent des captures et un exemple de rapport PDF dans `.data/screenshots/`, ainsi qu’un rapport dans `playwright-report/`. Les bases de tests ne contiennent que des jeux de données dédiés et n’utilisent jamais la base de développement.

Les résultats obtenus et le périmètre de vérification sont consignés dans [le compte rendu de validation](docs/VALIDATION.md).

## Stack et organisation

```text
src/
  api.js                  Axios, CSRF, traitement des erreurs
  state.jsx               Session et état du laboratoire
  App.jsx                 Navigation, thèmes, routes et droits
  components/ui.jsx       Modales, tables, badges, pagination
  pages/                  13 écrans fonctionnels
  styles.css, pages.css   Tailwind CSS 4 et styles SOC responsive
server/
  config.js, database.js  Configuration et connexion MongoDB Atlas
  models.js               Schémas Mongoose stricts
  auth.js                 bcrypt, JWT, sessions, CSRF, rôles
  domain.js               Simulation, sauvegarde, SHA-256, reprise
  app.js                  API REST, validations et autorisations
  seed-data.js            Organisation et ressources fictives
tests/                    Tests API et navigateur
docs/                     Architecture, API et soutenance
```

Frontend : React, Vite, Tailwind CSS, Framer Motion, React Router, Axios, React Hook Form, Zod, Lucide React, Recharts et React Hot Toast. Backend : Node.js, Express 5, MongoDB, Mongoose et `node:crypto` pour SHA-256. Le verrou `package-lock.json` rend les versions installées reproductibles.

## Architecture et périmètre

Le laboratoire utilise un **agrégat MongoDB unique** contenant les ressources, incidents, sauvegardes, étapes et journaux. Une mutation métier est validée sur une copie, puis enregistrée en une écriture atomique avec contrôle de version Mongoose. Deux simulations concurrentes ne peuvent pas écraser l’état l’une de l’autre : la seconde reçoit HTTP 409 et doit être réessayée après actualisation. Les utilisateurs et sessions ont leurs propres collections.

Ce choix convient à un laboratoire borné : 144 fichiers, 30 copies, 100 incidents et 2 000 journaux conservés. Il ne constitue pas une architecture SOC à grande échelle. Les snapshots contiennent seulement de petits textes générés ; les tailles affichées sont simulées. Les événements d’authentification/gestion des comptes, stockés dans des collections différentes, ne constituent pas une transaction multi-document avec le journal.

Une seule simulation peut rester ouverte à la fois. La sauvegarde choisie pour un incident doit couvrir **tous** ses fichiers, même si la restauration se fait en plusieurs lots. Une copie partielle reste utile pour protéger un périmètre limité, mais sera refusée pour un incident plus étendu. Sans sauvegarde compatible, la reprise est bloquée ; l’application ne fabrique pas un succès ni une sauvegarde antérieure.

Le score est pédagogique, non certifiant. Voir [l’architecture et le modèle de sécurité](docs/ARCHITECTURE.md) ainsi que [la référence API](docs/API.md).

## Configuration de production

Pour une instance déployée, fournir `NODE_ENV=production`, `MONGODB_URI`, un `JWT_SECRET` aléatoire d’au moins 48 caractères, `CLIENT_ORIGIN` en HTTPS et, à la première initialisation, `ADMIN_EMAIL` et `ADMIN_PASSWORD` (12 caractères minimum, 72 octets maximum). `CLIENT_ORIGIN` doit être l’origine exacte du frontend, par exemple `https://protocoldesecurit-tp.onrender.com` (sans chemin ; le slash final est normalisé). Sur Render, `RENDER_EXTERNAL_URL` est également autorisée automatiquement. `HOST=0.0.0.0` permet une écoute à l’intérieur d’un conteneur ; par défaut l’écoute est limitée à `127.0.0.1`.

Pour connecter le frontend Vite local à une API déjà déployée, définir `VITE_API_PROXY_TARGET=https://votre-api.example.com` dans `.env`, puis lancer `npm run dev:web`. Les appels restent relatifs à `/api` dans le navigateur et passent par le proxy Vite, ce qui conserve le modèle de cookie same-origin.

Le déploiement Netlify utilise la réécriture définie dans `netlify.toml` pour relayer `/api/*` vers l’API Render. Sur Render, définir `CLIENT_ORIGIN=https://protocoledesucurite.netlify.app` afin d’autoriser les mutations provenant du frontend Netlify. La règle `/api/*` doit rester placée avant la règle SPA `/*`.

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Servir `dist/` via l’API derrière un reverse proxy HTTPS ; les cookies Secure sont activés en production. MongoDB doit être authentifié et accessible uniquement au backend. Le secret temporaire de développement invalide les sessions lors d’un redémarrage ; définir `JWT_SECRET` pour une signature stable. Ne jamais committer `.env`.

Un [Dockerfile](Dockerfile) est fourni pour construire l’application. La recette conteneur n’est pas nécessaire au lancement local et requiert une base MongoDB externe configurée. Elle ne configure pas de domaine ou de certificat TLS.

## Dépannage

- **Connexion Atlas impossible** : lancer `npm.cmd run db:check`, vérifier l’utilisateur dans Database Access, son mot de passe, les autorisations IP dans Network Access et la disponibilité du cluster. Le nom d’utilisateur de base de données est distinct du compte de connexion au site Atlas.
- **URL incomplète** : remplacer `<db_username>` et `<db_password>` dans `.env`. Les caractères spéciaux des identifiants doivent être encodés dans l’URL ; ne pas partager le contenu du fichier.
- **Erreur DNS `querySrv ECONNREFUSED`** : certains environnements Windows exposent à Node.js un résolveur local qui ne répond pas. La variable optionnelle `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` dans `.env` sélectionne les résolveurs pour le processus Node.js uniquement, sans modifier Windows. Elle est configurée sur cette installation après vérification du problème. Sans cette variable, le DNS système est utilisé. Voir le [dépannage DNS officiel Atlas](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).
- **Port occupé** : arrêter l’autre instance de l’application. Le frontend utilise 5173, l’API 4000 et les tests navigateur 4100. Si vous modifiez ces ports, ajuster le proxy Vite et `CLIENT_ORIGIN` ensemble.
- **HTTP 403 sur POST** : utiliser l’URL autorisée et une session active ; l’API vérifie l’origine ainsi que `X-CSRF-Token`.
- **HTTP 409** : une action concurrente a modifié l’état, une étape est hors ordre, ou une ressource est protégée. Lire le message retourné et actualiser.
- **Bac à sable Windows / esbuild « Access is denied »** : le chargement natif de la configuration est activé. Le préassemblage Vite nécessite néanmoins que le processus ait accès aux dépendances et puisse parcourir les dossiers parents ; démarrer `npm.cmd run dev` depuis un terminal disposant de ces droits.
- **Pas de PDF téléchargé automatiquement** : l’export PDF passe par la fenêtre d’impression du navigateur. L’export JSON télécharge directement un fichier.

## Références techniques

- [Express : recommandations de sécurité et cookies](https://expressjs.com/en/advanced/best-practice-security/)
- [MongoDB : atomicité des écritures sur un document](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)
- [MongoDB Atlas : connexion, utilisateur de base et autorisations IP](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)
- [Tailwind CSS : intégration Vite](https://tailwindcss.com/docs/installation/using-vite)
