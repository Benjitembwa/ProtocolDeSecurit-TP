# Architecture et sécurité de Sentinel

## Flux d’une requête

1. React Router choisit la page ; le contexte d’authentification charge `/api/auth/me`.
2. Axios envoie le cookie de session et, pour une écriture, `X-CSRF-Token`.
3. Express applique Helmet, CORS, l’origine autorisée, la limite JSON (64 Ko), les quotas puis l’authentification.
4. JWT est validé avec l’algorithme HS256 imposé, l’émetteur `sentinel`, l’audience `sentinel-web`, la date d’expiration et une session MongoDB encore active.
5. L’utilisateur est relu en base : le rôle et l’état actif ne proviennent pas d’une revendication JWT potentiellement périmée.
6. L’autorisation de rôle précède la validation Zod et le traitement métier.
7. Une opération sur le laboratoire charge l’agrégat, valide ses invariants, modifie une copie puis enregistre avec `optimisticConcurrency`. Les horodatages internes et le numéro de version ne sont jamais remplacés par cette copie.
8. React recharge l’état autorisé et les graphiques. Un polling de 20 secondes synchronise les changements d’un autre utilisateur lorsque l’onglet est visible.

## Modèle MongoDB

| Collection | Contenu                                                                                         | Contrôle                                                         |
| ---------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `users`    | Nom, e-mail unique, bcrypt, rôle, actif                                                         | Schéma strict, hash exclu des lectures ordinaires                |
| `sessions` | Identifiant de session aléatoire, utilisateur, hash CSRF, expiration                            | Index TTL et expiration vérifiée à chaque requête                |
| `labs`     | Organisation, fichiers, machines, services, copies, incidents, plan, audit, historique du score | Un document `main`, sous-schémas stricts, verrouillage optimiste |

Toutes les collections de l’application sont persistées dans la base `sentinel` sur MongoDB Atlas. Le backend impose une connexion SRV Atlas avec TLS et refuse les identifiants incomplets, les connexions locales et les options désactivant la validation des certificats. Le navigateur ne reçoit jamais de mot de passe haché, de secret JWT ni de contenu des snapshots. Les identifiants de fichiers sont des références fictives, pas des chemins du système hôte.

La projection `/api/state` retire les contenus, réduit les fichiers et machines à ceux autorisés pour USER, retire ses incidents/sauvegardes et limite les journaux complets à ADMIN. Les indicateurs globaux ne donnent pas accès aux contenus individuels.

L’agrégat unique permet d’utiliser les garanties d’atomicité MongoDB sur un document sans exiger un replica set local. Le champ de version empêche les pertes de mise à jour. Une opération refusée n’enregistre aucun changement partiel. Les opérations sur `users` et `sessions` sont distinctes de l’écriture de leur trace d’audit ; elles ne sont pas des transactions multi-documents.

## Authentification

- bcrypt avec coût 12. Les nouveaux mots de passe exigent 12 caractères et au plus 72 octets UTF-8 pour éviter la troncature bcrypt.
- Un hash factice est comparé pour une adresse inconnue afin de réduire les différences de temps de réponse.
- JWT de 8 heures ; aucune conservation du JWT dans `localStorage`.
- Cookie HttpOnly, SameSite Strict, Path `/`. En production : Secure et nom `__Host-sentinel`.
- Identifiant de session aléatoire de 32 octets, conservé côté serveur ; la déconnexion rend un JWT copié inutilisable.
- Changement de mot de passe, de rôle ou des accès : révocation des sessions de l’utilisateur.
- CSRF dérivé par HMAC du secret et de l’identifiant de session, transmis dans la réponse de connexion/profil et gardé en mémoire frontend. Le serveur compare son hash en temps constant.
- Les mutations exigent une origine explicitement autorisée. L’origine et le jeton CSRF sont deux contrôles indépendants.
- 10 échecs de connexion par IP et par fenêtre de 15 minutes ; 240 requêtes API par minute et par IP. Stockage des limites en mémoire, adapté à une seule instance.

Les comptes ADMIN ne sont pas rétrogradables ni désactivables dans l’interface. Cette règle maintient l’accès administratif même si deux administrateurs tentent simultanément de modifier leurs droits. Un utilisateur ordinaire peut être désactivé ; ses ressources restent traçables et réattribuables.

## Invariants de simulation et de reprise

1. Au plus un incident non résolu.
2. Aucun chiffrement réel : `content` ne change pas pendant la simulation. Seuls les états, dates et indicateurs sont modifiés.
3. Les machines sélectionnées et les dépendances des services définissent le périmètre. Les fichiers sont choisis avec `crypto.randomInt`.
4. Toute simulation crée un incident, son auteur, son impact, ses systèmes/services, son plan et une trace d’audit.
5. On ne peut pas sauvegarder une référence compromise ou dont le contenu ne correspond pas au hash.
6. Les étapes doivent être exécutées dans l’ordre. L’état PENDING/IN_PROGRESS/COMPLETED suit l’exécution effective ; une case cochée ne suffit pas à restaurer.
7. La copie choisie doit couvrir tous les fichiers de l’incident. Un incident utilise une seule sauvegarde de référence ; plusieurs lots de fichiers peuvent être restaurés.
8. La copie est revérifiée au moment de restaurer, même si elle a été vérifiée auparavant.
9. Un fichier étranger à l’incident ou déjà restauré est refusé.
10. Tous les fichiers doivent être restaurés, puis contrôlés, avant la réactivation des services et la clôture.
11. Une sauvegarde référencée par un incident ne peut pas être supprimée, même après clôture.

La restauration copie le contenu du snapshot dans le fichier fictif en base, recalcule son empreinte et le marque RESTORED. Les machines restent isolées durant la reprise ; seul le passage « Réactivation » remet leurs services en ligne.

## SHA-256 : ce qui est vérifié

Chaque fichier possède `hash = SHA256(content encodé en UTF-8)`. Une copie conserve le contenu et son empreinte. Un manifeste JSON déterministe, trié par identifiant, comprend `id`, `name`, `machineId`, `size` et `hash` ; l’empreinte du manifeste est conservée aussi.

La vérification compare :

- les contenus recalculés aux empreintes de chaque fichier ;
- le manifeste recalculé à l’empreinte du manifeste ;
- le nombre de fichiers et la somme des tailles à leurs métadonnées.

L’ordre de stockage des fichiers n’altère pas le manifeste. Une modification de contenu, de nom ou de taille est détectable. Une copie dont le contenu est altéré peut conserver un manifeste correspondant : il faut bien contrôler **les deux niveaux**.

Le hash est une vérification d’intégrité, pas une signature indépendante. Un administrateur direct de MongoDB capable de réécrire contenus et empreintes peut fabriquer une référence cohérente. Une architecture de production demanderait des références signées, un coffre distinct et un audit externalisé et immuable.

## Mesures

```text
S = 50 × (SAFE + RESTORED) / total des fichiers
  + 30 × fichiers couverts par une copie fiable récente / total des fichiers
  + 20 × services ONLINE / total des services
```

Le résultat est arrondi entre 0 et 100. Une copie fiable pour la couverture a un état VALID ou RESTORED, une date de vérification, une empreinte de fichier de référence correspondante et un âge inférieur ou égal au RPO configuré. Le score mesure une préparation pédagogique ; il n’est pas une probabilité réelle de survie à une attaque.

- **RTO mesuré** : secondes entre la création et la clôture de l’incident. C’est le temps du parcours de l’utilisateur dans cet exercice.
- **RPO mesuré** : âge de la sauvegarde au moment de la détection, exprimé en minutes. Aucune perte réelle de transactions n’est calculée.
- **Taux restauré** : fichiers restaurés de l’incident / fichiers affectés initialement.
- **Impact** : fichiers compromis initialement / fichiers de l’organisation.
- **Score avant** : mesuré à la création de l’incident ; **score après** : mesuré à sa clôture.

Le score actuel peut ensuite varier si une sauvegarde devient trop ancienne. Le rapport conserve le score de clôture, distinct du score actuel.

## Limites assumées

- Organisation unique et bornée : 144 fichiers générés, 30 copies, 100 incidents, 180 mesures et 2 000 événements maximum. Les limites empêchent la croissance incontrôlée du document MongoDB.
- Pas d’agent endpoint, de malware, de chiffrement, de scan réseau, de détection comportementale ou de remédiation sur une vraie infrastructure.
- Aucun envoi d’e-mail ni récupération de mot de passe par e-mail ; le changement de mot de passe exige la session et le secret actuel.
- Les horodatages d’audit proviennent du serveur. Le journal n’est pas immuable face à un accès administrateur direct à MongoDB.
- Pas de haute disponibilité, d’orchestration multisite, de sauvegarde réelle du serveur, de chiffrement applicatif des snapshots ou de SIEM externe.
- Le développement comme la production utilisent MongoDB Atlas. Les bases MongoDB locales temporaires sont réservées aux tests automatisés, avec des jeux de données distincts ; aucune donnée de l’application n’y est copiée.
- L’animation de lancement est pédagogique ; les progressions de reprise représentent les étapes réellement terminées et le nombre de fichiers effectivement restaurés.

## Références

[Atomicité MongoDB](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/) motive le choix d’un agrégat pour les opérations liées. Les [recommandations Express](https://expressjs.com/en/advanced/best-practice-security/) servent de base aux protections HTTP et aux cookies.
