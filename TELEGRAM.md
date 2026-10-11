# TELEGRAM.md — Notifications Telegram (travail sur serveur distant)

> **Condition d’application** : ces conventions ne s’appliquent **que** lorsque
> l’agent travaille sur un serveur distant (session SSH, box distante, machine
> non surveillée pendant la tâche). Elles ne s’appliquent **pas** au travail en
> local, où l’utilisateur voit directement le terminal.

## Pourquoi

Quand l’agent tourne sur un serveur distant, l’utilisateur n’a pas d’écran
devant lui. Sans notification, une tâche longue est invisible jusqu’à ce que la
session soit relue. Le bot Telegram est le canal de retour : il permet de
recevoir une confirmation de fin de tâche, et des captures pour valider un rendu
visuel sans avoir à se connecter.

## Outil

CLI `tg-notify`, installé sur le serveur dans `~/.local/bin/`.

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Implémentation : `~/.local/bin/tg-notify.py` (Python stdlib uniquement, aucune
dépendance). La configuration (token, chat id) est lue dans
`~/.config/opencode-telegram-bot/.env` — variables `TELEGRAM_BOT_TOKEN` et
`TELEGRAM_ALLOWED_USER_ID`.

Ne jamais modifier ce `.env` ni le token sans demande explicite.

## Commandes

```bash
# Notification de fin de tâche (le cas nominal)
tg-notify "Tâche terminée: <résumé en une phrase>"

# Message + capture d'écran
tg-notify -i /tmp/shot.png "Voici le rendu de la page candidats"

# Message + document (rapport, log, diff)
tg-notify -d /tmp/report.pdf "Rapport du sprint"

# Image + document ensemble
tg-notify -i /tmp/shot.png -d app.log "Capture + logs"

# Message depuis la sortie d'une commande
bun run typecheck 2>&1 | tg-notify -p html -i /tmp/errors.png "Résultat du typecheck"
```

### Options

| Option                     | Effet                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| `-i, --image PATH\|URL`    | Envoie une image (`png`, `jpg`, `gif`…). Répétable.                   |
| `-d, --document PATH\|URL` | Envoie un document (`pdf`, `txt`, `log`…). Répétable.                 |
| `-p, --parse html`         | Active le balisage (gras, italic, code, liens). Défaut : texte brut.  |
| `-t, --topic ID`           | Cible un topic de forum Telegram.                                     |
| `-q, --quiet`              | Aucune sortie dans le terminal ; le code de sortie indique le succès. |

Le texte fourni devient la légende du premier média ; au-delà de 1024 caractères
il est tronqué puis envoyé en message séparé. Chemin local ou URL acceptés pour
les médias.

## Quand notifier

Notifier à la fin d’une tâche, une fois le travail **vérifié** :

- après `bun run typecheck`, `bun run test` ou `bun run build` passés ;
- après avoir capturé une page pour validation visuelle ;
- après une action longue ou bloquante dont l’utilisateur doit connaître le résultat ;
- après une modification de données (migration, script de seed) exécutée.

Ne pas notifier à chaque commande : une notification par tâche, pas par étape.

## Captures d'écran

Pour tout ce qui est visuel (page Nuxt, rendu d’un composant, layout), la
vérification passe par une capture envoyée sur Telegram. Enregistrer dans
`/tmp/opencode/`, jamais dans le dépôt.

```bash
mkdir -p /tmp/opencode
# capturer avec le script headless du serveur, puis :
tg-notify -i /tmp/opencode/page.png "Page /candidates — rendu vérifié"
```

## Règles

- **Vérifier avant d’annoncer.** Ne jamais envoyer « terminé » sans avoir lancé
  le typecheck, les tests ou un contrôle visuel. Une notification announcing un
  échec vaut mieux qu’un silence sur un travail cassé.
- **Un seul message de synthèse** par tâche. Regrouper les détails dans le même
  message plutôt que d’envoyer une série de messages.
- **Tout rapport part en document.** Analyse, plan d’implémentation, benchmark,
  compte rendu de tests : ce sont des fichiers `.md`, envoyés via `-d`. Ne pas
  découper un rapport en plusieurs messages pour contourner la limite de
  4096 caractères — c’est la fonction du document.
- **Une recommandation chiffrée n’est jamais livrée en prose seulement.** Elle
  part en `.md`, avec les sources et les réserves de fiabilité.
- **Ne jamais envoyer de secrets.** Tokens, cookies, clés `.env`, mots de passe
  VPS ou de base de données sont exclus, y compris dans les logs et captures.
- **Fichier introuvable = échec explicite.** Si un média ne peut pas être lu,
  prévenir dans le texte du message plutôt que d’envoyer un envoi partiel
  silencieusement.
- **Ne pas faire tourner le bot en arrière-plan** ni installer de dépendances
  supplémentaires pour l’utiliser.
- **Silencieux si l’envoi échoue** : une erreur réseau vers Telegram ne doit
  jamais faire échouer la tâche principale ni faire boucler l’agent.
- **Le bot est un canal de notification, pas un canal de contrôle.** Ne pas
  attendre de réponse de l’utilisateur dans la même tâche.
