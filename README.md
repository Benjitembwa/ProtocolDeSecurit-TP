Sentinel — Simulateur web de résilience face aux rançongiciels

Projet académique de Master 1 Réseaux et Sécurité Informatique consacré à la simulation contrôlée d’incidents de type rançongiciel et à l’étude des mécanismes de résilience, de contrôle d’accès, d’intégrité et de reprise après incident.

Important : Sentinel est un simulateur pédagogique. Il n’exécute aucun rançongiciel réel, ne chiffre aucun fichier du système hôte et n’effectue aucune attaque ou aucun scan sur une infrastructure externe.

1. Contexte académique

Université : Université de Kinshasa

Faculté : Faculté des Sciences

Département : Mathématiques et Informatique

Filière : Master 1 Réseaux et Sécurité Informatique

Cours : Protocoles de Sécurité Réseau

Année académique : 2025–2026

Titulaire du cours : Prof. KASENGEDIA BOTUMBE

Collaborateur : Doctorant KANINGINI LUTALA Junior

Membres du groupe

N°

Nom complet

1

TEMBWA NGENGO BENJI

2

MBUYI MUTUNGILAYI Benjamin

3

KAZADI KABUYA Augustin

4

LUABEYA MUKENDI Barnabé

2. Présentation du projet

Sentinel est une application web permettant de simuler, dans un environnement entièrement fictif et contrôlé, l’impact d’un incident de type ransomware sur les ressources d’une organisation.

L’application permet notamment de :

gérer des utilisateurs, machines, serveurs, services et fichiers fictifs ;

lancer des scénarios d’incident de différents niveaux ;

observer les ressources compromises ;

créer et vérifier des sauvegardes ;

contrôler l’intégrité des données avec SHA-256 ;

gérer les incidents et leur cycle de vie ;

restaurer les ressources affectées ;

suivre un plan de reprise après incident ;

appliquer un contrôle d’accès basé sur les rôles ;

mesurer des indicateurs de résilience ;

consulter des journaux et rapports d’incident.

Les simulations modifient uniquement l’état logique des ressources stockées dans l’application. Aucun fichier réel de l’ordinateur de l’utilisateur n’est chiffré ou modifié.

3. Objectif général

Concevoir, développer et déployer une application web fonctionnelle démontrant l’utilisation de mécanismes de sécurité réseau et cryptographiques pour améliorer la résilience d’un système d’information face à des scénarios simulés de rançongiciel.

Objectifs spécifiques

simuler différents niveaux d’incident sans utiliser de logiciel malveillant réel ;

sécuriser les échanges entre le navigateur et l’application avec HTTPS/TLS ;

mettre en œuvre une authentification sécurisée ;

contrôler les accès avec le modèle RBAC ;

vérifier l’intégrité des données avec SHA-256 ;

gérer des sauvegardes et leur restauration ;

représenter un plan de reprise après incident ;

produire des journaux, rapports et indicateurs de résilience ;

démontrer les principales étapes de détection, confinement et récupération.

4. Liens du projet

Ressource

Adresse

Application déployée

https://protocole-de-securite.netlify.app/

Dépôt GitHub

https://github.com/Benjitembwa/ProtocolDeSecurit-TP

5. Architecture générale

L’application suit une architecture web Full-Stack composée d’un frontend React, d’une API REST Node.js/Express et d’une base de données MongoDB.

flowchart LR
    U[Utilisateur] -->|HTTPS / TLS| F[Frontend React / Vite]
    F -->|Requêtes API| API[API REST Node.js / Express]

    API --> AUTH[Authentification / JWT / RBAC]
    API --> SIM[Moteur de simulation]
    API --> INC[Gestion des incidents]
    API --> BCK[Gestion des sauvegardes]
    API --> SHA[Vérification SHA-256]
    API --> REC[Plan de reprise]
    API --> REP[Rapports et indicateurs]

    AUTH --> DB[(MongoDB Atlas)]
    SIM --> DB
    INC --> DB
    BCK --> DB
    SHA --> DB
    REC --> DB
    REP --> DB

Les échanges entre le navigateur et l’application déployée sont protégés par HTTPS/TLS. Les secrets applicatifs sont fournis à travers des variables d’environnement et ne doivent jamais être enregistrés directement dans le code source.

6. Technologies utilisées

Frontend

React

Vite

Tailwind CSS

Framer Motion

React Router

Axios

React Hook Form

Zod

Lucide React

Recharts

React Hot Toast

Backend

Node.js

Express.js

MongoDB Atlas

Mongoose

node:crypto pour SHA-256

Sécurité

HTTPS/TLS

bcrypt pour le hachage des mots de passe

JWT pour l’authentification

RBAC pour l’autorisation

cookies HttpOnly / SameSite

protection CSRF

validation Zod

limitation des requêtes

Helmet

variables d’environnement

SHA-256 pour la vérification d’intégrité

7. Modules fonctionnels

7.1 Simulation des incidents

Le simulateur propose plusieurs niveaux :

Faible : compromission limitée ;

Moyen : impact intermédiaire ;

Critique : impact important ;

Personnalisé : sélection manuelle des ressources concernées.

Chaque simulation peut affecter des fichiers, postes, serveurs ou services fictifs et génère automatiquement un incident.

7.2 Centre des incidents

Chaque incident contient notamment :

un identifiant ;

une date ;

un niveau de gravité ;

les ressources affectées ;

les fichiers compromis ;

son impact ;

les actions réalisées ;

son état.

Cycle de vie principal :

DETECTED → CONTAINED → RECOVERY → RESOLVED

7.3 Sauvegardes

Le système permet de :

créer des sauvegardes complètes ou partielles ;

consulter leur contenu ;

vérifier leur intégrité ;

restaurer les ressources ;

supprimer une sauvegarde lorsque le rôle l’autorise.

7.4 Vérification SHA-256

Chaque donnée fictive peut disposer d’une empreinte SHA-256.

Lors d’une vérification :

l’empreinte de référence est récupérée ;

l’empreinte actuelle est recalculée ;

les deux valeurs sont comparées ;

le système indique si l’intégrité est valide ou si une altération est détectée.

7.5 Restauration et plan de reprise

Le workflow de récupération suit notamment les étapes suivantes :

détection ;

confinement ;

analyse ;

sélection d’une sauvegarde fiable ;

vérification SHA-256 ;

restauration ;

contrôle d’intégrité ;

réactivation des services ;

clôture de l’incident.

7.6 Tableau de bord

Le tableau de bord permet de suivre :

le nombre de machines et serveurs ;

le nombre de fichiers ;

les fichiers sains, compromis ou restaurés ;

les incidents ;

les sauvegardes ;

l’état des services ;

les dernières activités ;

le score de résilience ;

l’évolution des principaux indicateurs.

8. Rôles et autorisations

Le système utilise trois rôles.

ADMIN

L’administrateur possède les permissions les plus étendues. Il peut notamment :

gérer les utilisateurs ;

lancer les simulations ;

gérer les sauvegardes ;

effectuer les restaurations ;

gérer le plan de reprise ;

consulter les rapports et journaux.

SECURITY_ANALYST

L’analyste de sécurité peut notamment :

consulter les incidents ;

analyser les simulations ;

vérifier les empreintes SHA-256 ;

consulter les sauvegardes ;

consulter les rapports ;

accéder aux fonctionnalités d’un utilisateur simple.

USER

L’utilisateur simple peut principalement :

consulter l’état général du système ;

consulter les ressources qui lui sont autorisées.

Le modèle de droits est hiérarchique : ADMIN dispose également des capacités de SECURITY_ANALYST, qui dispose lui-même des capacités de USER.

9. Comptes de démonstration

Rôle

Adresse e-mail

Mot de passe

ADMIN

admin@sentinel.lab

Sentinel!2026

SECURITY_ANALYST

analyst@sentinel.lab

Sentinel!2026

USER

user@sentinel.lab

Sentinel!2026

Ces comptes sont exclusivement destinés à la démonstration académique. Ne pas réutiliser ces identifiants dans une application réelle.

10. Installation locale

Prérequis

Node.js 22.12+ ou 24

npm

connexion Internet

accès à un cluster MongoDB Atlas

Cloner le projet

git clone https://github.com/Benjitembwa/ProtocolDeSecurit-TP.git
cd ProtocolDeSecurit-TP

Installer les dépendances

npm install

Sous Windows PowerShell, il est également possible d’utiliser :

npm.cmd install

Configurer les variables d’environnement

Copier le fichier d’exemple :

cp .env.example .env

Sous Windows :

copy .env.example .env

Renseigner ensuite les valeurs nécessaires sans publier les secrets :

MONGODB_URI=<mongodb-atlas-connection-string>
MONGODB_DB_NAME=sentinel
JWT_SECRET=<secret-long-et-aleatoire>
CLIENT_ORIGIN=http://127.0.0.1:5173

Pour un déploiement de production, prévoir également les paramètres nécessaires à l’initialisation administrative selon la configuration du serveur.

Ne jamais committer le fichier .env ni placer des identifiants MongoDB dans une variable VITE_*.

Vérifier la connexion à MongoDB

npm run db:check

Lancer l’application

npm run dev

Par défaut :

Frontend : http://127.0.0.1:5173

API : http://127.0.0.1:4000

11. Commandes utiles

Commande

Description

npm run dev

Lance le frontend et l’API en développement

npm run dev:web

Lance uniquement le frontend

npm run dev:api

Lance uniquement l’API

npm run build

Compile le frontend dans dist/

npm start

Lance l’API et sert le frontend compilé

npm run db:check

Vérifie la connexion MongoDB Atlas

npm run seed

Initialise les données de démonstration si nécessaire

npm test

Exécute les tests d’intégration et de sécurité

npm run test:e2e

Exécute les tests navigateur

npm run check

Compile puis exécute les tests API

12. Scénario de démonstration recommandé

Se connecter avec le compte administrateur.

Présenter le tableau de bord et l’état initial des ressources.

Créer ou vérifier une sauvegarde complète.

Effectuer une vérification SHA-256 sur une donnée intacte.

Tester une donnée volontairement altérée afin de montrer l’échec du contrôle d’intégrité.

Lancer un scénario de simulation faible, moyen ou critique.

Observer les fichiers et services compromis ainsi que l’incident créé.

Ouvrir le processus de restauration.

Effectuer le confinement et l’analyse.

Sélectionner une sauvegarde valide.

Vérifier son intégrité.

Restaurer les ressources affectées.

Réactiver les services et clôturer l’incident.

Consulter le rapport final et le score de résilience.

Se connecter avec les rôles SECURITY_ANALYST puis USER afin de démontrer les différences de permissions.

13. Tests réalisés

Le projet comporte des tests fonctionnels et de sécurité portant notamment sur :

ID

Test

Résultat attendu

T1

Accès HTTPS

Connexion HTTPS valide

T2

Authentification valide

Accès accordé

T3

Authentification invalide

Accès refusé sans information sensible

T4

RBAC

Fonction réservée inaccessible avec un rôle insuffisant

T5

SHA-256 — intégrité

Empreintes identiques

T6

SHA-256 — altération

Empreintes différentes

T7

Sauvegarde / reprise

Ressources restaurées

T8

Validation des entrées

Valeur invalide rejetée

T9

Gestion des erreurs

Aucun secret ou détail interne exposé

Pour exécuter les tests automatisés :

npm test
npm run build
npm run test:e2e

14. Indicateurs de résilience

Le simulateur permet d’illustrer plusieurs indicateurs permettant d’évaluer la capacité de récupération après un incident :

MTTD : temps moyen de détection ;

MTTR : temps moyen de reprise ;

disponibilité des sauvegardes ;

taux de restauration ;

intégrité des ressources restaurées ;

disponibilité des services ;

score de résilience avant et après récupération.

Ces indicateurs sont pédagogiques et dépendent des scénarios et paramètres de démonstration. Ils ne doivent pas être interprétés comme des performances représentatives d’une infrastructure réelle.

15. Déploiement

Frontend

Le frontend est déployé sur Netlify et est accessible en HTTPS.

Backend

L’API Node.js/Express est prévue pour être déployée sur une plateforme compatible telle que Render. Le fichier netlify.toml permet au frontend Netlify de relayer les requêtes /api/* vers l’API configurée.

En production, les paramètres sensibles doivent être définis uniquement dans les variables d’environnement de la plateforme :

NODE_ENV=production
MONGODB_URI=<mongodb-atlas-connection-string>
MONGODB_DB_NAME=sentinel
JWT_SECRET=<secret-aleatoire-d-au-moins-48-caracteres>
CLIENT_ORIGIN=<origine-https-du-frontend>

MongoDB doit rester accessible uniquement au backend.

16. Sécurité, éthique et conformité

Ce projet respecte un cadre strictement pédagogique et éthique.

Il n’effectue :

aucun chiffrement malveillant réel ;

aucune propagation de ransomware ;

aucun scan non autorisé ;

aucune attaque contre une machine externe ;

aucune collecte de données personnelles réelles ;

aucune collecte de paiement réel.

Les machines, fichiers, utilisateurs, sauvegardes, incidents et services manipulés par Sentinel sont fictifs ou synthétiques.

Les secrets applicatifs sont placés dans des variables d’environnement et exclus du dépôt Git.

17. Limites du projet

Sentinel est un simulateur académique et non une plateforme SOC professionnelle ou un outil réel de réponse aux rançongiciels.

Ses principales limites sont les suivantes :

aucun fichier réel n’est chiffré ;

aucune propagation réseau réelle n’est simulée ;

les performances observées dépendent des données fictives du laboratoire ;

HTTPS/TLS ne garantit pas à lui seul la sécurité globale de l’application ;

SHA-256 contrôle l’intégrité mais n’assure pas la confidentialité ;

le RBAC dépend d’une configuration correcte des rôles et permissions ;

les sauvegardes simulées ne reproduisent pas toutes les contraintes d’une infrastructure de production ;

le score de résilience est pédagogique et non certifiant.

18. Structure simplifiée du projet

.
├── src/
│   ├── components/
│   ├── pages/
│   ├── api.js
│   ├── state.jsx
│   └── App.jsx
│
├── server/
│   ├── app.js
│   ├── auth.js
│   ├── config.js
│   ├── database.js
│   ├── domain.js
│   ├── models.js
│   └── seed-data.js
│
├── tests/
├── docs/
├── public/
├── scripts/
├── .env.example
├── netlify.toml
├── Dockerfile
├── package.json
└── vite.config.js

19. Conclusion

Sentinel démontre de manière pratique comment plusieurs mécanismes de sécurité peuvent être combinés pour améliorer la résilience d’un système d’information face à un incident simulé de type rançongiciel.

Le projet met particulièrement en évidence la complémentarité entre HTTPS/TLS, authentification, RBAC, SHA-256, sauvegardes, journalisation et plan de reprise.

L’objectif n’est pas de reproduire une attaque réelle, mais de fournir un environnement sûr permettant d’observer les conséquences d’un incident, d’appliquer les différentes étapes de récupération et de mieux comprendre les principes de résilience et de sécurité des réseaux.

Projet académique — Université de Kinshasa

Master 1 Réseaux et Sécurité Informatique — Année académique 2025–2026
