#!/usr/bin/env bash
# Prepare persistent VPS media storage for the production API container.
# Container user is appuser (uid 1001 / gid 1001) as pinned in services/api/Dockerfile.
#
# Run on the VPS BEFORE docker compose up, from the repo root.
set -euo pipefail

HOST_MEDIA_ROOT="${HOST_MEDIA_ROOT:-/var/lib/wopp/media}"
APP_UID="${APP_UID:-1001}"
APP_GID="${APP_GID:-1001}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

sudo mkdir -p \
  "${HOST_MEDIA_ROOT}/ebooks/file" \
  "${HOST_MEDIA_ROOT}/ebooks/cover" \
  "${HOST_MEDIA_ROOT}/clips/media" \
  "${HOST_MEDIA_ROOT}/clips/thumbnail" \
  "${HOST_MEDIA_ROOT}/programs/banner" \
  "${HOST_MEDIA_ROOT}/events/banner" \
  "${HOST_MEDIA_ROOT}/announcements/image" \
  "${HOST_MEDIA_ROOT}/mentorship/banner" \
  "${HOST_MEDIA_ROOT}/mentorship/mentor" \
  "${HOST_MEDIA_ROOT}/images"

# Copy existing named-volume uploads if they still exist and the host dir is empty.
VOLUME_NAME="$(docker volume ls -q | grep -E 'uploads_prod_data$' | head -n 1 || true)"
if [ -n "${VOLUME_NAME}" ]; then
  HOST_FILE_COUNT="$(find "${HOST_MEDIA_ROOT}" -type f | wc -l | tr -d ' ')"
  if [ "${HOST_FILE_COUNT}" = "0" ]; then
    echo "Copying existing Docker volume ${VOLUME_NAME} -> ${HOST_MEDIA_ROOT}"
    docker run --rm \
      -v "${VOLUME_NAME}:/from" \
      -v "${HOST_MEDIA_ROOT}:/to" \
      alpine:3.20 \
      sh -c 'cp -a /from/. /to/'
  else
    echo "Host media directory already has files; skipping volume copy."
  fi
else
  echo "No uploads_prod_data volume found; skipping copy."
fi

# Also copy files currently inside a running container, if any.
if docker compose -f "${COMPOSE_FILE}" ps api --status running >/dev/null 2>&1; then
  echo "Syncing /app/uploads from the running api container (no deletes)."
  docker compose -f "${COMPOSE_FILE}" exec -T api \
    sh -c 'if [ -d /app/uploads ]; then tar -C /app/uploads -cf - .; fi' \
    | sudo tar -C "${HOST_MEDIA_ROOT}" -xf - || true
fi

sudo chown -R "${APP_UID}:${APP_GID}" "${HOST_MEDIA_ROOT}"
sudo find "${HOST_MEDIA_ROOT}" -type d -exec chmod 755 {} \;
sudo find "${HOST_MEDIA_ROOT}" -type f -exec chmod 644 {} \;

echo "Media root ready: ${HOST_MEDIA_ROOT} (owner ${APP_UID}:${APP_GID})"
