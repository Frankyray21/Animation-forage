#!/bin/sh
# Lance la CLI HyperFrames 0.8.144, toujours de la même façon :
#   - environnement vide puis liste blanche (env -i) : ni jeton, ni clé, ni courriel ne passent au navigateur (un plantage de
#     Chromium écrit tout l'environnement du processus dans ses rapports de plantage) ;
#   - HOME, TMPDIR et cache d'extraction dans $HF_TRAVAIL/.hf (hors dépôt ; rien n'est écrit ailleurs) ;
#   - navigateur imposé : headless shell Chromium 141 de Playwright (sans lui, HyperFrames prendrait un autre Chrome
#     ou en téléchargerait un) ;
#   - hors ligne : espace réseau vide, lo seul (unshare -n en root ; sans droits, unshare -rn : espace de noms utilisateur) ;
#     tout accès réseau caché échoue. Si ni l'un ni l'autre n'est permis (noyau sans espaces de noms, espaces de noms
#     utilisateur coupés) : avertissement, et la commande tourne SANS isolation réseau ;
#   - priorité minimale (nice -n 19) ; en root, CAP_SYS_NICE retirée de l'ensemble limite (setpriv) : sans cela, Chromium
#     relevait ses fils principaux à nice −8 et les autres à 0 ;
#   - version vérifiée (0.8.144) avant chaque commande ;
#   - sous-commandes permises : lint, check, render, snapshot, timeline, --version, « telemetry disable ».
#     Interdites : preview (injecte GSAP depuis jsDelivr), usage, auth, login, publish, cloud, browser, doctor, upgrade, etc.
#   - snapshot : « --describe false » ajouté (sinon envoi des images à un service externe de description si une clé existe) ;
#   - jamais dans le dépôt : le dossier courant et chaque chemin donné (valeur d'option comprise, quelle que soit l'option)
#     doivent être hors du dépôt.
# Variables : HYPERFRAMES (requis : …/node_modules/.bin/hyperframes d'un « npm ci » de installation/, fait hors dépôt),
#   HF_NAVIGATEUR (défaut : chromium_headless_shell-1194 de $PLAYWRIGHT_BROWSERS_PATH ou de ~/.cache/ms-playwright),
#   FFMPEG, FFPROBE (défaut : ceux du PATH), HF_TRAVAIL (défaut : $TMPDIR/clam-hf). Node ≥ 22 pris dans le PATH.
# Usage : cd "$HF_TRAVAIL" && "$DEPOT/video/hyperframes/hf.sh" lint D --verbose
#         (cd "$HF_TRAVAIL/D" && "$DEPOT/video/hyperframes/hf.sh" render . --format png-sequence --output "$HF_TRAVAIL/D-png" --workers 1 …)
set -eu
ICI=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
DEPOT=$(CDPATH= cd -- "$ICI/../.." && pwd -P)
VERSION=0.8.144
REV_NAVIGATEUR=chromium_headless_shell-1194   # Chromium 141.0.7390.37 (Playwright 1.56)
erreur() { echo "hf.sh : $*" >&2; exit 1; }
absolu() { case "$1" in /*) printf '%s\n' "$1" ;; *) command -v -- "$1" 2>/dev/null || true ;; esac; }
dans() { case "$1/" in "$2"/*) return 0 ;; esac; return 1; }   # chemin $1 égal à $2 ou dessous

case "${1:-}" in
  lint|check|render|snapshot|timeline|--version) ;;
  telemetry) [ "${2:-}" = disable ] && [ $# -eq 2 ] || { echo "hf.sh : seul « telemetry disable » est permis" >&2; exit 2; } ;;
  *) echo "hf.sh : sous-commande « ${1:-} » refusée (permises : lint, check, render, snapshot, timeline, --version, telemetry disable)" >&2; exit 2 ;;
esac

HF=${HYPERFRAMES:-}
[ -n "$HF" ] || erreur "HYPERFRAMES non défini (chemin de node_modules/.bin/hyperframes d'un « npm ci » de video/hyperframes/installation/, fait hors dépôt)"
if [ -n "${HF_NAVIGATEUR:-}" ]; then NAVIGATEUR=$HF_NAVIGATEUR
else NAVIGATEUR=${PLAYWRIGHT_BROWSERS_PATH:-${HOME:-/nonexistent}/.cache/ms-playwright}/$REV_NAVIGATEUR/chrome-linux/headless_shell; fi
FFMPEG_HF=$(absolu "${FFMPEG:-ffmpeg}")
FFPROBE_HF=$(absolu "${FFPROBE:-ffprobe}")
NODE=$(command -v node 2>/dev/null || true)
PYTHON=$(command -v python3 2>/dev/null || true)
for f in "$HF" "$NAVIGATEUR" "$FFMPEG_HF" "$FFPROBE_HF" "$NODE" "$PYTHON"; do
  [ -n "$f" ] && [ -x "$f" ] || erreur "introuvable ou non exécutable : « $f » (voir les variables en tête de hf.sh)"
done
dans "$(realpath -m -- "$HF")" "$DEPOT" && erreur "HYPERFRAMES dans le dépôt ($HF) : l'installer à part (npm ci de video/hyperframes/installation/, hors dépôt)"
NODE_BIN=$(dirname -- "$NODE")
v_node=$("$NODE" -p 'process.versions.node.split(".")[0]')
[ "$v_node" -ge 22 ] || erreur "Node $v_node : HyperFrames $VERSION demande Node ≥ 22"

# dossier de travail hors dépôt ; ni le dossier courant ni un chemin donné dans le dépôt
TRAVAIL=$(realpath -m -- "${HF_TRAVAIL:-${TMPDIR:-/tmp}/clam-hf}")
if dans "$TRAVAIL" "$DEPOT" || dans "$DEPOT" "$TRAVAIL"; then erreur "HF_TRAVAIL ($TRAVAIL) doit être hors du dépôt ($DEPOT)"; fi
if [ "$1" != --version ] && [ "$1" != telemetry ]; then
  dans "$(pwd -P)" "$DEPOT" && erreur "dossier courant dans le dépôt ($(pwd -P)) : lancer depuis \$HF_TRAVAIL ou le projet"
  # toute valeur qui ressemble à un chemin, sans liste d'options (--output, --frames-cache-dir, -o=…, -o/chemin…) : avec « / »,
  # ou existante ; un nom relatif sans « / » qui n'existe pas ne peut pas mener au dépôt (dossier courant hors dépôt)
  for a in "$@"; do
    case "$a" in
      -*=*) a=${a#*=} ;;
      --*) continue ;;
      -[!-]*/*) a=${a#-?} ;;   # option courte collée à sa valeur : -o/chemin
      -*) continue ;;
    esac
    case "$a" in */*) ;; *) [ -e "$a" ] || continue ;; esac
    dans "$(realpath -m -- "$a")" "$DEPOT" && erreur "chemin dans le dépôt refusé : $a"
  done
fi

if [ "$1" = snapshot ]; then
  case " $* " in *" --describe "*) ;; *) set -- "$@" --describe false ;; esac
fi
mkdir -p "$TRAVAIL/.hf/home" "$TRAVAIL/.hf/tmp" "$TRAVAIL/.hf/cache"

# hors ligne : espace réseau vide si possible ; priorité : CAP_SYS_NICE retirée en root (un autre utilisateur ne l'a pas)
if unshare -n true 2>/dev/null; then   # root : unshare -n d'abord (setpriv garde alors son effet)
  ISOLER="unshare -n $PYTHON -I $ICI/outils/netns-lo.py"
elif unshare -rn true 2>/dev/null; then   # sans droits : espace de noms utilisateur, lo seul
  ISOLER="unshare -rn $PYTHON -I $ICI/outils/netns-lo.py"
else
  ISOLER=
  echo "hf.sh : AVERTISSEMENT : ni « unshare -n » ni « unshare -rn » permis (noyau sans espaces de noms, ou espaces de noms utilisateur coupés)." >&2
  echo "hf.sh : HyperFrames tourne SANS isolation réseau. Restent : environnement vide, télémétrie coupée, navigateur imposé," >&2
  echo "hf.sh : projet contrôlé hors ligne par gen.mjs." >&2
fi
if [ "$(id -u)" = 0 ]; then
  SETPRIV=$(command -v setpriv 2>/dev/null || true)
  [ -n "$SETPRIV" ] || erreur "setpriv introuvable (util-linux) : nécessaire en root pour garder Chromium à nice 19"
  PRIORITE="$SETPRIV --bounding-set -sys_nice"
else
  PRIORITE=
fi
lancer() {
  # shellcheck disable=SC2086  # ISOLER et PRIORITE : listes de mots voulues (chemins sans espace vérifiés plus bas)
  env -i PATH="$NODE_BIN:/usr/local/bin:/usr/bin:/bin" HOME="$TRAVAIL/.hf/home" TMPDIR="$TRAVAIL/.hf/tmp" LANG=C.UTF-8 \
    HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1 HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_SKIP_SKILLS=1 HYPERFRAMES_NO_AUTO_INSTALL=1 \
    HYPERFRAMES_EXTRACT_CACHE_DIR="$TRAVAIL/.hf/cache" HYPERFRAMES_FFMPEG_PATH="$FFMPEG_HF" HYPERFRAMES_FFPROBE_PATH="$FFPROBE_HF" \
    HYPERFRAMES_BROWSER_PATH="$NAVIGATEUR" \
    nice -n 19 $PRIORITE $ISOLER "$HF" "$@"
}
case "$ICI$PYTHON${SETPRIV:-}" in *[[:space:]]*) erreur "chemin avec espace non pris en charge (dépôt, python3 ou setpriv) : $ICI" ;; esac
v=$(lancer --version 2>/dev/null | tail -n 1 | tr -d '[:space:]')
[ "$v" = "$VERSION" ] || erreur "version de HyperFrames inattendue : « $v » (attendu $VERSION)"
[ "$1" = --version ] && { echo "$v"; exit 0; }
lancer "$@"
