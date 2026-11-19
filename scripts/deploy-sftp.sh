#!/usr/bin/env bash
# Upload dist/ to a docroot on the cPanel host over SFTP, then check the live
# site serves this build. Shared by the production release (deploy.yml) and the
# staging deploy (deploy-staging.yml), which differ only in DEPLOY_PATH and
# SITE_URL.
#
# Env: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY, DEPLOY_KNOWN_HOSTS,
# SITE_URL (the public URL of DEPLOY_PATH, trailing slash included).
set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST not set}" "${DEPLOY_USER:?DEPLOY_USER not set}" \
  "${DEPLOY_PATH:?DEPLOY_PATH not set}" "${DEPLOY_SSH_KEY:?DEPLOY_SSH_KEY not set}" \
  "${DEPLOY_KNOWN_HOSTS:?DEPLOY_KNOWN_HOSTS not set}" "${SITE_URL:?SITE_URL not set}"

# Key and host keys live in a private temp dir, gone on any exit, failure
# included, so a run outside CI never touches the user's own ~/.ssh.
ssh_dir=$(mktemp -d)
trap 'rm -rf "$ssh_dir"' EXIT
key=$ssh_dir/deploy_key
known_hosts=$ssh_dir/known_hosts
printf '%s\n' "$DEPLOY_SSH_KEY" > "$key"
chmod 600 "$key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$known_hosts"

# Host key from a secret, not ssh-keyscan: keyscan trusts whatever answers at
# deploy time, which is exactly the check being skipped. A known_hosts entry is
# keyed by the exact host string, so the connection would only report a bare
# "Host key verification failed". Name the two ways to get there instead.
if grep -q '^|1|' "$known_hosts"; then
  echo "::error::DEPLOY_KNOWN_HOSTS holds hashed entries, which only match the" \
       "host they were hashed for. Regenerate with: ssh-keyscan $DEPLOY_HOST"
  exit 1
fi
if ! ssh-keygen -F "$DEPLOY_HOST" -f "$known_hosts" > /dev/null; then
  echo "::error::DEPLOY_KNOWN_HOSTS ($(wc -l < "$known_hosts") entries) names no" \
       "host matching DEPLOY_HOST. The two secrets have to agree on how the host" \
       "is spelled. Regenerate with: ssh-keyscan $DEPLOY_HOST"
  exit 1
fi

# The hosting account has SFTP but no shell, which rules rsync out (it runs its
# own binary on the far side). `lftp mirror` is the same directory sync over
# SFTP. lftp is not on the runner image.
if ! command -v lftp > /dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq lftp
fi

# Two passes, in this order, because a static site is briefly inconsistent
# while it uploads: pass one adds the new hashed assets without deleting
# anything, so the old index.html keeps resolving; pass two writes the new
# index.html and only then removes what the build dropped.
#
# --delete makes DEPLOY_PATH this app's alone. The excludes are cPanel's own
# directories in a docroot: .well-known carries the ACME challenges that renew
# the TLS certificate, and cgi-bin comes with every docroot.
#
# `open -u USER,` with the empty password stops lftp prompting for one and
# falling back to an anonymous login; the key goes to ssh, not lftp.
lftp -c "
  set sftp:connect-program 'ssh -a -x -i $key -o IdentitiesOnly=yes -o UserKnownHostsFile=$known_hosts';
  open -u $DEPLOY_USER, sftp://$DEPLOY_HOST;
  mirror --reverse --verbose --parallel=4 \
         --exclude '^\.well-known/' --exclude '^cgi-bin/' \
         --exclude '(^|/)\.DS_Store$' --exclude '^index\.html$' \
         dist/ '$DEPLOY_PATH';
  mirror --reverse --verbose --delete \
         --exclude '^\.well-known/' --exclude '^cgi-bin/' \
         --exclude '(^|/)\.DS_Store$' \
         dist/ '$DEPLOY_PATH';
"

# Done only when the server serves this build: the served page names this
# build's entry script (a stale index.html names the old one), and that script
# loads. The entry path already carries the build's base, so it is fetched from
# the site's origin. No `curl | grep -q` here: under pipefail, grep quitting
# early fails curl on a broken pipe.
entry=$(grep -m1 -o 'src="[^"]*/assets/[^"]*\.js"' dist/index.html | cut -d'"' -f2) || {
  echo "::error::dist/index.html names no entry script"
  exit 1
}
page=$(curl -sSf --retry 3 --retry-delay 5 "$SITE_URL")
if [[ $page != *"src=\"$entry\""* ]]; then
  echo "::error::$SITE_URL does not serve this build's index.html (expected $entry)"
  exit 1
fi
rest=${SITE_URL#*://}
curl -sSf -o /dev/null "${SITE_URL%%://*}://${rest%%/*}$entry"
