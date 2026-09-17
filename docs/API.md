# Référence API

Préfixe : `/api`. Réponses JSON, excepté les réponses vides 204. L’application React passe par le proxy Vite en développement et par la même origine que l’API après compilation.

Toute mutation demande une origine autorisée et, après connexion, l’en-tête `X-CSRF-Token`. Les cookies sont envoyés par le navigateur (`withCredentials: true`). Le profil et la connexion renvoient le jeton CSRF ; aucune authentification par jeton stocké dans le navigateur n’est utilisée.

## Authentification

| Méthode / chemin      | Accès                   | Corps / résultat                                                 |
| --------------------- | ----------------------- | ---------------------------------------------------------------- |
| `GET /health`         | Public                  | Disponibilité de MongoDB et indicateur de simulation             |
| `GET /meta`           | Public                  | Métadonnées publiques et disponibilité du mode démo              |
| `POST /auth/login`    | Public, origine requise | `{ email, password }` → utilisateur, CSRF et cookie HttpOnly     |
| `GET /auth/me`        | Session                 | Profil et CSRF                                                   |
| `POST /auth/logout`   | Session + CSRF          | Révocation de session, suppression du cookie, 204                |
| `POST /auth/password` | Session + CSRF          | `{ currentPassword, newPassword }` ; révoque toutes les sessions |

## Laboratoire

| Méthode / chemin                      | Rôle           | Corps / résultat                                                             |
| ------------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `GET /state`                          | Tous           | État filtré selon le rôle, métriques générales, tableaux, historique         |
| `POST /simulations`                   | ADMIN          | `{ scenario, title?, fileCount?, machineIds?, serviceIds? }` → incident, 201 |
| `POST /backups`                       | ADMIN          | `{ name, fileIds? }` → métadonnées de copie, 201                             |
| `POST /backups/:id/verify`            | ADMIN, ANALYST | Empreintes attendues/calculées, résultat global et par fichier               |
| `DELETE /backups/:id`                 | ADMIN          | Refus si copie référencée par un incident ; sinon 204                        |
| `POST /integrity/files`               | ADMIN, ANALYST | `{ fileIds: [...] }` → contrôle des contenus actifs                          |
| `POST /incidents/:id/actions/:action` | ADMIN          | Action du workflow décrite ci-dessous                                        |
| `GET /reports/:id`                    | ADMIN, ANALYST | Rapport de l’incident ; les valeurs non encore mesurées restent absentes     |
| `PATCH /settings`                     | ADMIN          | `{ rtoMinutes, rpoMinutes }`                                                 |
| `PATCH /files/:id/owner`              | ADMIN          | `{ ownerId }` ; doit référencer un compte actif                              |

`ANALYST` désigne le rôle technique `SECURITY_ANALYST`. Les réponses ne contiennent pas les contenus des fichiers ni des sauvegardes.

Scénarios : `LOW`, `MEDIUM`, `CRITICAL`, `CUSTOM`. Pour CUSTOM, `fileCount` est obligatoire, entier entre 1 et 144 et inférieur ou égal au nombre de fichiers éligibles. Les serveurs référencés par `serviceIds` s’ajoutent à `machineIds`. Sans sélection, toute l’organisation est éligible. Les tableaux d’identifiants dupliqués, les champs inattendus, les ressources inconnues et les valeurs hors limites sont refusés.

Une création de sauvegarde sans sélection prend tous les fichiers sains ou restaurés. Une sélection explicite contenant un fichier compromis ou altéré est rejetée intégralement.

## Workflow d’incident

La détection est effectuée automatiquement lors de la simulation. Puis :

| Action       | Corps          | Conditions et effets                                                                        |
| ------------ | -------------- | ------------------------------------------------------------------------------------------- |
| `isolate`    | `{}`           | Isole les machines, arrête les services fictifs ; statut CONTAINED                          |
| `analyze`    | `{}`           | Confinement requis ; confirme le périmètre                                                  |
| `select`     | `{ backupId }` | Analyse requise, copie couvrant tous les fichiers ; référence RPO enregistrée               |
| `verify`     | `{}`           | Copie sélectionnée requise ; SHA-256 contenu et manifeste ; échec bloque la suite           |
| `restore`    | `{ fileIds }`  | Isolation et copie vérifiée requises ; contrôle immédiat et copie des fichiers sélectionnés |
| `test`       | `{}`           | Tous les fichiers restaurés ; comparaison finale avec la référence                          |
| `reactivate` | `{}`           | Contrôle final réussi ; services ONLINE, isolation levée                                    |
| `close`      | `{}`           | Reprise complète ; incident RESOLVED, durée et score final figés                            |

`select` peut remplacer une copie tant qu’aucun fichier n’a été restauré. Cette opération invalide la vérification précédente. L’API ne propose aucun PATCH permettant de forcer un statut d’incident ou d’étape.

## Comptes

| Méthode / chemin   | Corps                                                               |
| ------------------ | ------------------------------------------------------------------- |
| `GET /users`       | Aucun ; profils publics, ADMIN seulement                            |
| `POST /users`      | `{ name, email, password, role }`, ADMIN seulement                  |
| `PATCH /users/:id` | `{ name?, role?, active? }`, ADMIN seulement ; révoque les sessions |

Les utilisateurs ajoutés n’obtiennent pas automatiquement des documents. Attribuer leurs ressources depuis le détail d’un fichier ou avec `/files/:id/owner`.

## Erreurs

```json
{ "error": "Message lisible par l’utilisateur." }
```

La validation peut ajouter `details: [{ path, message }]`. Aucune stack serveur n’est renvoyée au client.

| Code | Signification                                                       |
| ---- | ------------------------------------------------------------------- |
| 400  | Validation, sélection incohérente, sauvegarde inadéquate            |
| 401  | Session manquante/expirée/révoquée, identifiants invalides          |
| 403  | Rôle insuffisant, origine ou CSRF incorrect                         |
| 404  | Ressource ou route inexistante                                      |
| 409  | Concurrence, étape hors ordre, référence protégée, doublon d’e-mail |
| 413  | Corps JSON supérieur à 64 Ko                                        |
| 429  | Limite de requêtes/tentatives atteinte                              |
| 503  | Base ou laboratoire indisponible                                    |

Un résultat SHA-256 négatif issu d’une **vérification** est une réponse 200 avec `valid: false`, permettant de présenter les divergences. Une tentative de **restauration** dont la revérification échoue est rejetée en 409, sans aucune copie partielle.
