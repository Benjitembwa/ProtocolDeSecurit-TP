# Validation de la version académique

Vérifications exécutées le **13 septembre 2026**, sous Windows avec **Node.js 24.15.0** et **Microsoft Edge en mode headless**.

| Vérification                            | Résultat                                                    |
| --------------------------------------- | ----------------------------------------------------------- |
| Compilation Vite (`npm run build`)      | Réussie ; frontend généré dans `dist/`                      |
| Tests API et configuration (`npm test`) | **26 réussis**, 0 échec                                     |
| Tests navigateur (`npm run test:e2e`)   | **4 réussis**, 0 échec                                      |
| Mise en forme (`npm run format:check`)  | Conforme                                                    |
| Audit npm des dépendances de production | **0 vulnérabilité connue signalée** lors de la vérification |

Les tests API utilisent une vraie instance MongoDB temporaire. Ils couvrent notamment bcrypt, sessions/JWT expirés ou révoqués, contrôle CSRF et d’origine, refus de privilèges, restrictions sur les fichiers, scénarios, concurrence, références de sauvegarde, SHA-256, copies altérées et reprise complète en plusieurs lots.

Les tests navigateur couvrent les 13 pages, les modes sombre et clair, la recherche, l’affichage mobile à 390 pixels sans débordement horizontal, la vérification d’une copie altérée et d’une copie fiable, puis un exercice comprenant sauvegarde, simulation, reprise à 75 % puis 100 %, contrôle final, réactivation, clôture et export. Les autorisations analyste/utilisateur et la déconnexion sont aussi vérifiées dans le navigateur.

Les tests n’effacent ni ne modifient la base du laboratoire de développement. Les bases et comptes utilisés pour les parcours automatisés sont jetables.

## Raccordement à MongoDB Atlas

La connexion réelle à la base distante `sentinel` a été vérifiée avec `npm run db:check`, puis le laboratoire a été initialisé dans Atlas : collections `users`, `sessions` et `labs`, avec 3 comptes, 12 systèmes fictifs, 144 fichiers fictifs et 2 sauvegardes.

Un contrôle via l’API a confirmé la connexion administrateur, la récupération du profil et de l’état, puis la déconnexion et le refus de réutiliser cette session. Après fermeture et réouverture de la connexion MongoDB, les identifiants, empreintes et états des fichiers étaient conservés. Une nouvelle initialisation a laissé ces données intactes. Aucune simulation de test n’a été lancée dans Atlas.

Le DNS fourni à Node.js sur cette machine (`127.0.0.1`) refusait les requêtes SRV. Les résolveurs configurables `MONGODB_DNS_SERVERS` ont résolu ce problème sans modifier la configuration DNS Windows. Les cinq tests de configuration couvrent l’absence de repli local, les identifiants incomplets, TLS, les résolveurs et la confidentialité des erreurs. Les fichiers compilés du frontend ont également été contrôlés : ils ne contiennent ni URI de connexion privée, ni mot de passe Atlas, ni secret JWT.

Les quatre tests navigateur ci-dessus proviennent de la validation de l’interface précédant le raccordement Atlas ; ils utilisent une base temporaire indépendante.

## Livrables de vérification

- Résultats API : `.data/api-tests.log`.
- Résultats navigateur : `.data/e2e-tests.log`.
- Rapport Playwright : `playwright-report/index.html`.
- Captures des pages : `.data/screenshots/`.
- Rapport PDF produit par le navigateur : `.data/screenshots/rapport-exemple.pdf`.

Les premiers essais ont mis en évidence un remplacement indésirable de l’horodatage immuable Mongoose et des captures prises pendant les animations. Ces problèmes ont été corrigés avant la dernière exécution réussie. Un onglet d’IDE contenant l’ancien `error-context.md` n’est donc pas le résultat de la dernière validation.

Cette validation est fonctionnelle et technique. L’audit npm ne constitue pas un audit de sécurité complet du code. Le Dockerfile est fourni mais n’a pas été exécuté dans cet environnement, où Docker n’est pas installé. Aucun déploiement de production n’a été effectué.
