#!/bin/bash

DB_HOST="localhost"
DB_PORT="5431"
DB_NAME="avtorend"
DB_USER="postgres"
export PGPASSWORD="1234"

BACKUP_DIR="$(dirname "$0")/backups"
mkdir -p "$BACKUP_DIR"

FILENAME="$BACKUP_DIR/${DB_NAME}_$(date +%Y-%m-%d_%H-%M-%S).sql.gz"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "✓ Резервная копия сохранена: $FILENAME"
else
  echo "✗ Ошибка при создании резервной копии"
  exit 1
fi

# Удалять бэкапы старше 7 дней
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
