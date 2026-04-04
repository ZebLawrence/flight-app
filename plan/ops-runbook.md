# Ops Runbook — Backup, Restore & Disaster Recovery

> **Scope**: This runbook covers backup, restore, and disaster-recovery procedures for the
> Flight App production stack: Next.js app, PostgreSQL 16, MinIO (S3-compatible storage),
> and Caddy reverse proxy, all running under Docker Compose on a single host.
>
> **Audience**: A new operator who has SSH access to the production host and the `.env.prod`
> secrets file should be able to follow every step without additional context.

---

## Table of Contents

1. [Database Backup](#1-database-backup)
2. [S3 / MinIO Backup](#2-s3--minio-backup)
3. [Restore Procedures](#3-restore-procedures)
4. [Disaster Recovery](#4-disaster-recovery)
5. [Secrets Rotation](#5-secrets-rotation)

---

## 1. Database Backup

### 1.1 — Daily `pg_dump` snapshot

A daily logical backup captures the full schema and data in a single portable file.

```bash
#!/usr/bin/env bash
# /opt/flight-app/scripts/backup-db.sh
set -euo pipefail

BACKUP_DIR="/opt/flight-app/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/flightapp_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

# Run pg_dump inside the running db container (no exposed port required).
# --format=custom produces a compressed, parallel-restore-capable archive.
docker exec flight-app-db \
  pg_dump \
    --username="${POSTGRES_USER:-postgres}" \
    --dbname="${POSTGRES_DB:-flightapp}" \
    --format=custom \
    --compress=9 \
    --no-password \
  > "${BACKUP_FILE}"

echo "DB backup written to ${BACKUP_FILE}"

# Prune backups older than 30 days (retention policy — adjust as needed).
find "${BACKUP_DIR}" -name "*.dump" -mtime +30 -delete
echo "Old backups pruned."
```

**Schedule** — install as a daily cron job (runs at 02:00 server time):

```
0 2 * * * /opt/flight-app/scripts/backup-db.sh >> /var/log/flight-app-backup.log 2>&1
```

**Retention policy**

| Backup type | Frequency | Keep for |
|-------------|-----------|----------|
| `pg_dump` snapshot | Daily | 30 days |
| WAL archive segments | Continuous | 7 days (see §1.2) |

**Storage location** — keep at least one copy off-host:

```bash
# Copy today's dump to an off-host backup bucket (adjust endpoint/bucket):
aws s3 cp "${BACKUP_FILE}" s3://your-backup-bucket/db/ \
  --endpoint-url https://your-backup-s3-endpoint
```

Or use `rclone` if the backup destination is not AWS S3:

```bash
rclone copy "${BACKUP_FILE}" backup-remote:your-backup-bucket/db/
```

---

### 1.2 — WAL archiving (point-in-time recovery)

WAL archiving lets you restore the database to any point in time between daily snapshots.
Enable it by adding the following to `postgresql.conf` (or via Docker environment variables):

```ini
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /wal_archive/%f && cp %p /wal_archive/%f'
archive_cleanup_command = 'pg_archivecleanup /wal_archive %r'
```

Mount `/wal_archive` as a host volume in `docker-compose.prod.yml`:

```yaml
db:
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - /opt/flight-app/wal_archive:/wal_archive
```

Sync the archive directory off-host nightly:

```bash
# Append to crontab — runs at 03:00 server time
0 3 * * * rclone sync /opt/flight-app/wal_archive backup-remote:your-backup-bucket/wal/ \
  >> /var/log/flight-app-wal-sync.log 2>&1
```

Prune WAL segments older than 7 days from the local archive:

```bash
find /opt/flight-app/wal_archive -mtime +7 -delete
```

---

## 2. S3 / MinIO Backup

Media assets uploaded by tenants are stored in the `flight-app-media` MinIO bucket.
There are two complementary strategies: bucket replication and a scheduled sync job.

### 2.1 — MinIO bucket replication (recommended for production)

Configure server-side replication so every object written to the source bucket is
automatically mirrored to a backup bucket, either on the same MinIO instance or on a
remote one.

```bash
# Inside the minio container (or using the mc binary on the host):
docker exec -it flight-app-minio /bin/sh

# Configure the source alias
mc alias set source http://localhost:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

# Configure the destination alias (remote MinIO or AWS S3)
mc alias set dest https://backup-minio.example.com "${BACKUP_ACCESS_KEY}" "${BACKUP_SECRET_KEY}"

# Create the backup bucket if it does not exist
mc mb dest/flight-app-media-backup

# Enable versioning on both buckets (required for replication)
mc version enable source/flight-app-media
mc version enable dest/flight-app-media-backup

# Create a replication rule: every new/changed object is copied to the backup bucket
mc replicate add source/flight-app-media \
  --remote-bucket "https://${BACKUP_ACCESS_KEY}:${BACKUP_SECRET_KEY}@backup-minio.example.com/flight-app-media-backup" \
  --replicate "delete,delete-marker,existing-objects"
```

Verify replication status:

```bash
mc replicate status source/flight-app-media
```

---

### 2.2 — Scheduled sync cronjob (fallback / air-gap environments)

If server-side replication is unavailable (e.g., air-gapped host), use a nightly `mc mirror`
job instead:

```bash
#!/usr/bin/env bash
# /opt/flight-app/scripts/backup-minio.sh
set -euo pipefail

docker exec flight-app-minio \
  mc mirror \
    --overwrite \
    --remove \
    source/flight-app-media \
    dest/flight-app-media-backup

echo "MinIO mirror completed at $(date)"
```

**Schedule** — runs at 02:30 server time (after the DB backup):

```
30 2 * * * /opt/flight-app/scripts/backup-minio.sh >> /var/log/flight-app-backup.log 2>&1
```

**Retention** — the backup bucket should have an object lifecycle rule that expires objects
deleted from the source bucket after 30 days (configurable via `mc ilm`):

```bash
mc ilm add dest/flight-app-media-backup \
  --expiry-days 30 \
  --noncurrentversion-expiry-days 30
```

---

## 3. Restore Procedures

### 3.1 — Restore the database from a `pg_dump` snapshot

> **Prerequisite**: the `db` container is running and the target database is empty (or the
> operator is willing to drop and recreate it).

```bash
# 1. Identify the backup file to restore
BACKUP_FILE="/opt/flight-app/backups/db/flightapp_20260401_020000.dump"

# 2. Drop and recreate the target database (run inside the db container)
docker exec -it flight-app-db \
  psql --username=postgres --command="
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'flightapp' AND pid <> pg_backend_pid();
    DROP DATABASE IF EXISTS flightapp;
    CREATE DATABASE flightapp OWNER postgres;
  "

# 3. Restore from the custom-format dump
docker exec -i flight-app-db \
  pg_restore \
    --username=postgres \
    --dbname=flightapp \
    --no-owner \
    --no-privileges \
    --jobs=4 \
  < "${BACKUP_FILE}"

echo "Database restore complete."
```

Verify the restore:

```bash
docker exec -it flight-app-db \
  psql --username=postgres --dbname=flightapp \
       --command="\dt"   # lists all tables
```

---

### 3.2 — Restore the database to a point in time (WAL-based)

```bash
# 1. Stop the app so no new writes arrive during recovery
docker compose -f docker-compose.prod.yml stop app

# 2. Stop the db container
docker compose -f docker-compose.prod.yml stop db

# 3. Restore the closest preceding daily snapshot (see §3.1 steps 1–3)

# 4. Write recovery configuration directly into the Postgres data volume
#    while the db container is stopped.  The volume name matches what
#    docker-compose.prod.yml declares (prefix is the Compose project name,
#    defaulting to the directory name "flight-app").
docker run --rm \
  -v flight-app_postgres_data:/var/lib/postgresql/data \
  alpine sh -c "
    touch /var/lib/postgresql/data/recovery.signal
    cat >> /var/lib/postgresql/data/postgresql.conf <<'EOF'

restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2026-04-01 14:00:00 UTC'
recovery_target_action = 'promote'
EOF
  "

# 5. Start the db and let it apply WAL segments up to the target time
docker compose -f docker-compose.prod.yml start db

# 6. Watch the db logs until recovery completes
docker compose -f docker-compose.prod.yml logs -f db

# 7. Once promoted, restart the app
docker compose -f docker-compose.prod.yml start app
```

---

### 3.3 — Restore MinIO from backup bucket

```bash
# Mirror the backup bucket back to the primary bucket.
# Use --overwrite to replace objects that differ.
docker exec flight-app-minio \
  mc mirror \
    --overwrite \
    dest/flight-app-media-backup \
    source/flight-app-media

echo "MinIO restore complete."
```

If the MinIO data volume was lost entirely:

```bash
# 1. Start a fresh MinIO container (docker compose creates a new minio_data volume)
docker compose -f docker-compose.prod.yml up -d minio

# 2. Re-create the bucket and restore objects from the backup
docker exec flight-app-minio \
  mc alias set source http://localhost:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

docker exec flight-app-minio \
  mc mb source/flight-app-media

docker exec flight-app-minio \
  mc anonymous set public source/flight-app-media

docker exec flight-app-minio \
  mc mirror --overwrite \
    dest/flight-app-media-backup \
    source/flight-app-media
```

---

## 4. Disaster Recovery

> **Scenario**: the production host is gone. You need to restore the entire platform on a
> fresh server using the latest off-host backups.

### 4.1 — Prerequisites on the new host

```bash
# Install Docker Engine and the Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "${USER}"
newgrp docker

# Install rclone (or the AWS CLI) to retrieve backups from off-host storage
curl https://rclone.org/install.sh | sudo bash

# Configure rclone with your backup remote
rclone config  # interactive — follow prompts to add 'backup-remote'
```

---

### 4.2 — Retrieve the application code and configuration

```bash
# Clone the repository
git clone https://github.com/ZebLawrence/flight-app.git /opt/flight-app
cd /opt/flight-app

# Restore the .env.prod file from your secrets store (1Password, Vault, etc.)
# NEVER commit .env.prod to the repository.
cp /path/to/secrets/.env.prod /opt/flight-app/.env.prod
```

---

### 4.3 — Restore the database backup

```bash
# Download the most recent dump from off-host storage
mkdir -p /opt/flight-app/backups/db
rclone copy \
  backup-remote:your-backup-bucket/db/ \
  /opt/flight-app/backups/db/ \
  --max-age 48h   # only files from the last 48 h

BACKUP_FILE=$(ls -t /opt/flight-app/backups/db/*.dump | head -1)
echo "Restoring from: ${BACKUP_FILE}"

# Start only the db service so we can restore before the app comes up
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d db

# Wait until Postgres is ready to accept connections
until docker exec flight-app-db pg_isready -U postgres; do
  echo "Waiting for db…"; sleep 2
done

# Restore (the database was just created empty by Docker)
docker exec -i flight-app-db \
  pg_restore \
    --username=postgres \
    --dbname=flightapp \
    --no-owner \
    --no-privileges \
    --jobs=4 \
  < "${BACKUP_FILE}"
```

---

### 4.4 — Restore MinIO data

```bash
# Start MinIO
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d minio

# Wait for it to be healthy
sleep 10

# Re-create the primary bucket
docker exec flight-app-minio \
  mc alias set local http://localhost:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

docker exec flight-app-minio mc mb --ignore-existing local/flight-app-media
docker exec flight-app-minio mc anonymous set public local/flight-app-media

# Mirror from the backup bucket
docker exec flight-app-minio \
  mc alias set dest https://backup-minio.example.com \
    "${BACKUP_ACCESS_KEY}" "${BACKUP_SECRET_KEY}"

docker exec flight-app-minio \
  mc mirror --overwrite dest/flight-app-media-backup local/flight-app-media

echo "MinIO restore complete."
```

---

### 4.5 — Start all services

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

# Tail logs to confirm healthy startup
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
```

---

### 4.6 — Smoke test

```bash
# Health endpoint should return 200 {"status":"ok"}
curl -f https://your-domain.example.com/api/health

# Check all containers are healthy
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

---

### 4.7 — Update DNS (if IP address changed)

If the new host has a different IP address, update your DNS records:

| Record type | Name | Value |
|-------------|------|-------|
| `A` | `*.your-domain.example.com` | `<new host IP>` |
| `A` | `your-domain.example.com` | `<new host IP>` |

Caddy will automatically re-provision TLS certificates once DNS propagates.

---

## 5. Secrets Rotation

All secrets are stored only in `.env.prod` (never in the repository). Rotate them by
updating `.env.prod` and restarting the affected service. All rotations below are zero-
downtime when the rolling-restart steps are followed in order.

---

### 5.1 — Rotate the database password

```bash
# 1. Choose a new strong password
NEW_DB_PASSWORD=$(openssl rand -hex 32)

# 2. Update the password inside PostgreSQL
docker exec -it flight-app-db \
  psql --username=postgres --command=\
    "ALTER USER postgres PASSWORD '${NEW_DB_PASSWORD}';"

# 3. Update .env.prod with the new values
#    POSTGRES_PASSWORD=<new>
#    DATABASE_URL=postgresql://postgres:<new>@db:5432/flightapp
sed -i \
  -e "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${NEW_DB_PASSWORD}|" \
  -e "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:${NEW_DB_PASSWORD}@db:5432/flightapp|" \
  .env.prod

# 4. Reload only the app (db does not need a restart because the password
#    is already changed in Postgres — the old container's auth is no longer valid)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --no-deps app
```

---

### 5.2 — Rotate the JWT / session secret (`SESSION_SECRET`)

```bash
# 1. Generate a new secret
NEW_SESSION_SECRET=$(openssl rand -hex 64)

# 2. Update .env.prod
sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=${NEW_SESSION_SECRET}|" .env.prod

# 3. Restart only the app container — existing sessions will be invalidated
#    (users will need to log in again; this is expected)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --no-deps app

echo "SESSION_SECRET rotated. All active sessions have been invalidated."
```

If zero session interruption is required, deploy a second app instance before removing
the old one, or accept a short window where some users are logged out.

---

### 5.3 — Rotate the preview secret (`PREVIEW_SECRET`)

```bash
NEW_PREVIEW_SECRET=$(openssl rand -hex 64)
sed -i "s|PREVIEW_SECRET=.*|PREVIEW_SECRET=${NEW_PREVIEW_SECRET}|" .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --no-deps app
echo "PREVIEW_SECRET rotated. Existing preview links are now invalid."
```

---

### 5.4 — Rotate MinIO / S3 credentials

```bash
NEW_ACCESS_KEY=$(openssl rand -hex 16)
NEW_SECRET_KEY=$(openssl rand -hex 32)

# 1. Create the new access key in MinIO before removing the old one
docker exec -it flight-app-minio \
  mc admin user add local "${NEW_ACCESS_KEY}" "${NEW_SECRET_KEY}"

docker exec -it flight-app-minio \
  mc admin policy attach local readwrite --user "${NEW_ACCESS_KEY}"

# 2. Update .env.prod with new S3 credentials
sed -i \
  -e "s|S3_ACCESS_KEY=.*|S3_ACCESS_KEY=${NEW_ACCESS_KEY}|" \
  -e "s|S3_SECRET_KEY=.*|S3_SECRET_KEY=${NEW_SECRET_KEY}|" \
  -e "s|MINIO_ROOT_USER=.*|MINIO_ROOT_USER=${NEW_ACCESS_KEY}|" \
  -e "s|MINIO_ROOT_PASSWORD=.*|MINIO_ROOT_PASSWORD=${NEW_SECRET_KEY}|" \
  .env.prod

# 3. Restart the app to pick up the new credentials
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --no-deps app

# 4. Verify the app can still read/write objects
curl -f https://your-domain.example.com/api/health

# 5. Remove the old access key from MinIO (substitute the old key value)
docker exec -it flight-app-minio \
  mc admin user remove local "${OLD_ACCESS_KEY}"

echo "S3 credentials rotated successfully."
```

---

### 5.5 — Secrets rotation checklist

Use this checklist for any scheduled or emergency rotation:

- [ ] New secret generated with `openssl rand -hex <length>`
- [ ] `.env.prod` updated on the host (not committed to the repo)
- [ ] Affected service restarted with `docker compose … up -d --no-deps <service>`
- [ ] Health check passes: `curl -f https://your-domain.example.com/api/health`
- [ ] Old secret/key removed from the issuing system (MinIO, Postgres, etc.)
- [ ] Off-host secrets store (1Password / Vault) updated with the new value
- [ ] Rotation event logged in the incident / change log
