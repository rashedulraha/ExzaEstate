#!/bin/sh
# ==============================================================================
# ExzaEstate Automated Encrypted Database Backup Script
# Defined in docs/security/BACKUP_RESTORE_DRILL.md and agent/security.md §12
# ==============================================================================
set -eu

BACKUP_DIR="${BACKUP_DIR:-/var/backups/exzaestate}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
DATABASE_NAME="${POSTGRES_DB:-exzaestate}"
DATABASE_HOST="${POSTGRES_HOST:-localhost}"
DATABASE_PORT="${POSTGRES_PORT:-5432}"
DATABASE_USER="${POSTGRES_USER:-exza_admin}"
DUMP_FILE="${BACKUP_DIR}/exzaestate_${TIMESTAMP}.dump"
ENC_FILE="${DUMP_FILE}.enc"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u)] Starting automated database backup for '${DATABASE_NAME}'..."

# 1. Generate custom-format PostgreSQL dump
pg_dump \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -Fc \
  -f "${DUMP_FILE}" \
  "${DATABASE_NAME}"

echo "[$(date -u)] Database dump generated: ${DUMP_FILE}"

# 2. Encrypt using AES-256-CBC/GCM if encryption key is provided
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "[$(date -u)] Encrypting backup with AES-256..."
  openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "${DUMP_FILE}" \
    -out "${ENC_FILE}" \
    -pass env:BACKUP_ENCRYPTION_KEY
  rm -f "${DUMP_FILE}"
  TARGET_ARCHIVE="${ENC_FILE}"
else
  TARGET_ARCHIVE="${DUMP_FILE}"
fi

# 3. Generate SHA-256 checksum
shasum -a 256 "${TARGET_ARCHIVE}" > "${TARGET_ARCHIVE}.sha256"

echo "[$(date -u)] Backup completed successfully: ${TARGET_ARCHIVE}"
echo "[$(date -u)] SHA-256 checksum saved: ${TARGET_ARCHIVE}.sha256"
