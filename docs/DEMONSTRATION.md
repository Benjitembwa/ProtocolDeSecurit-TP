# Guide de soutenance

## Problématique

Comment mesurer et améliorer la capacité d’une organisation à maintenir puis rétablir ses données et services après un incident de type rançongiciel, sans exécuter de logiciel malveillant ?

Sentinel propose un modèle explicite d’état et un parcours contrôlé : une simulation provoque la compromission fictive de ressources, puis les mécanismes d’authentification, d’intégrité, de sauvegarde, de confinement et de restauration fonctionnent réellement sur les données du laboratoire.

## Présentation suggérée : 12 à 15 minutes

| Temps | Présentation                                    | Preuve montrée                                                             |
| ----- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| 2 min | Problématique, périmètre fictif et architecture | Diagramme décrit dans `ARCHITECTURE.md`, collections et rôles              |
| 2 min | État initial, fichiers et empreintes            | Dashboard, 12 systèmes et 144 fichiers                                     |
| 2 min | Sauvegarde fiable et copie altérée              | Résultats SHA-256 positif puis négatif                                     |
| 2 min | Simulation personnalisée ou critique            | Incident, impact, systèmes affectés, baisse du score                       |
| 4 min | Parcours de reprise                             | Confinement, analyse, SHA-256, restauration par lots, contrôle et services |
| 2 min | Bilan et contrôle des droits                    | Rapport PDF/JSON, RTO/RPO, connexion analyste/utilisateur                  |
| 1 min | Tests et limites                                | Tests API/navigateur et améliorations possibles                            |

## Expériences reproductibles

### E1 — Altération d’une copie

Vérifier « Échantillon altéré · test d’intégrité ». Un contenu a été modifié sans modifier son hash. Attendu : résultat `Integrity check failed`, fichier divergent identifié, copie exclue de la reprise.

### E2 — Incident limité

Créer une copie complète, choisir CUSTOM, 4 fichiers et `SERVER-FILES-01`. Attendu : 4 fichiers compromis, le serveur et son service affectés, un incident et des journaux. Les autres contenus sont conservés.

### E3 — Reprise progressive

Dans l’assistant, isoler puis analyser, choisir la copie et vérifier. Restaurer 3 fichiers sur 4 : progression à 75 %, contrôle final encore inaccessible. Restaurer le dernier puis effectuer le contrôle SHA-256. Réactiver et clôturer. Attendu : 100 % restauré, services disponibles, rapport complet.

### E4 — Séparation des rôles

Avec SECURITY_ANALYST, consulter le registre et vérifier SHA-256 ; lancement et restauration indisponibles. Avec USER, les fichiers des trois premiers postes sont visibles au départ, les autres ressources individuelles ne sont pas renvoyées par l’API. Montrer aussi les tests HTTP qui attendent 403 : cacher un bouton ne suffit pas à sécuriser une API.

### E5 — Sauvegarde incomplète

Créer une copie ne contenant qu’un fichier sain. Lancer un incident en affectant davantage. Attendu : la copie partielle ne peut pas être choisie pour restaurer tout l’incident. Conserver la copie complète de référence pour poursuivre la démonstration.

### E6 — Concurrence et altération après contrôle

Présenter les tests automatisés : deux simulations concurrentes donnent une réussite et un conflit 409 ; modifier une copie après sa première vérification entraîne le rejet de la restauration sans aucun fichier copié. Ces essais ne nécessitent pas de manipuler la base utilisée pendant la soutenance.

## Questions auxquelles savoir répondre

- **Pourquoi le fichier compromis conserve-t-il parfois un SHA valide ?** COMPROMISED est un état pédagogique. Le contenu n’a pas été chiffré ni altéré. La copie corrompue constitue une expérience distincte d’altération de contenu.
- **Pourquoi SHA-256 et pas le chiffrement ?** Le besoin est de comparer un contenu à une référence. Le chiffrement réel n’est ni nécessaire ni souhaitable dans ce modèle fictif.
- **Pourquoi MongoDB avec un seul agrégat de laboratoire ?** La cohérence des changements liés est obtenue par une écriture atomique sur document ; le laboratoire est volontairement petit et borné. Pour monter en charge, il faudrait séparer les collections et utiliser des transactions/outbox et un moteur de workflow.
- **Les journaux sont-ils inviolables ?** Non. Les routes empêchent leur modification directe, mais un accès administrateur à MongoDB permet de les altérer. Une production demanderait un stockage externe à accès limité ou une chaîne signée.
- **Le score garantit-il la sécurité ?** Non. Il mesure trois facteurs pédagogiques explicites, avec un poids fixe. Il ne remplace pas une évaluation de risque, des exercices opérationnels ni une certification.
- **RTO/RPO sont-ils réels ?** Les durées du parcours sont réellement horodatées. Le RPO mesure l’âge de la copie, sans modéliser des transactions métiers perdues. Les systèmes, données et impacts restent fictifs.
- **Qu’est-ce qui persiste ?** Comptes, données, snapshots, incidents, journaux et objectifs en MongoDB. Le navigateur ne conserve localement que la préférence de thème. Les secrets de session restent dans un cookie HttpOnly et la base de sessions.

## Prolongements possibles pour le mémoire

Mesures de détection MTTD et de confinement MTTC, dépendances de services plus fines, objectifs propres à chaque service, modèles de pertes de données entre sauvegardes, campagnes d’exercices comparables, multi-organisations, audit signé et sauvegardes immuables. Ces prolongements sont des pistes ; ils ne sont pas présentés comme implémentés.
