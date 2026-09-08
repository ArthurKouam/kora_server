# AGENTS.md — KoraHire Backend

## Projet

KoraHire est un ATS (Applicant Tracking System) SaaS ciblant le marché africain francophone. Ses différenciateurs clés sont l’intégration WhatsApp et Mobile Money.

Ce dépôt contient l’API AdonisJS consommée par le frontend Nuxt du dépôt séparé `kora_client`.

## Stack

- **Framework** : AdonisJS 7
- **ORM** : Lucid
- **Base de données** : PostgreSQL (Neon en production)
- **Cache et rate limiting** : Redis
- **Déploiement** : VPS via CloudPanel

## Conventions du projet

- **Clés primaires** : les migrations existantes utilisent des UUID PostgreSQL générés par `gen_random_uuid()`. Il n’existe actuellement pas de `BaseModel` custom générant des UUIDv7 ; ne pas supposer cette infrastructure ni introduire un autre format d’identifiant sans demande explicite.
- **Multi-tenant** : isoler par `organizationId` toutes les données rattachées à une organisation. Toute route ou requête staff doit dériver le tenant de l’utilisateur authentifié et filtrer par ce tenant.
- **Auth** : conserver les modèles et providers distincts : `User` pour le staff avec les guards `web`/`api`, et `Candidate` avec le guard `candidate_api`. Ne pas fusionner ces concepts ni leurs providers.
- **Historique** : enregistrer les changements d’état importants dans les tables d’historique dédiées. Respecter les champs polymorphes `changedByType`, `changedByUserId` et `changedByCandidateId` déjà utilisés.
- **Migrations** : suivre le style de `database/migrations` et mettre à jour ou créer le modèle Lucid correspondant lorsque le schéma métier change.
- **Services** : placer la logique métier consolidée dans des services dédiés plutôt que dans les contrôleurs. Utiliser `Promise.all` pour les agrégations indépendantes.
- **Sérialisation** : préserver la forme des réponses Lucid attendue par le frontend. Vérifier les consommateurs dans `kora_client` avant toute modification du contrat API.

## Commandes utiles

```bash
bun run dev
bun run build
bun run typecheck
bun run test
node ace migration:run
node ace migration:rollback
```

Vérifier `package.json` avant de supposer qu’un autre script existe.

## Ce que l’agent doit faire

- Respecter le scoping multi-tenant sur toute nouvelle route ou requête staff.
- Accompagner les changements de schéma du modèle Lucid correspondant.
- Écrire des tests pour toute nouvelle route ou tout nouveau service.
- Vérifier l’impact frontend avant de modifier un contrat de réponse API.

## Ce que l’agent ne doit pas faire

- Ne pas modifier les guards ou token providers sans confirmation explicite.
- Ne pas casser la sérialisation Lucid attendue par le frontend.
- Ne pas déployer ni modifier la configuration CloudPanel ou VPS sans demande explicite.
