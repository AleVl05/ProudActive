#!/bin/bash

# ==========================================================
# Deploy del proyecto Proudactive a servidor remoto
# ==========================================================

# Configuración
LOCAL_DIR="$(pwd)/"
REMOTE_USER="u576759887"
REMOTE_HOST="proudactive.iradogelateria.com.br"
REMOTE_PORT="65002"
REMOTE_DIR="/home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/"

# Archivos/carpetas a ignorar
EXCLUDES=(
    ".git"
    "storage"
)

# Construir la cadena de exclusión para rsync
EXCLUDE_PARAMS=""
for item in "${EXCLUDES[@]}"; do
    EXCLUDE_PARAMS+="--exclude=$item "
done

# Carpetas donde ignorar timestamps
IGNORE_TIMES_DIRS=(
    "public"
    "resources"
)

# Función para rsync general
rsync_general() {
    rsync -avz --delete -e "ssh -p $REMOTE_PORT" $EXCLUDE_PARAMS "$LOCAL_DIR" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
}

# Función para rsync ignorando timestamps
rsync_ignore_times() {
    for dir in "${IGNORE_TIMES_DIRS[@]}"; do
        rsync -avz --ignore-times --delete -e "ssh -p $REMOTE_PORT" "$LOCAL_DIR/$dir" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$dir"
    done
}

# --- DRY RUN ---
echo "=== DRY RUN ==="
rsync -avz --dry-run --delete -e "ssh -p $REMOTE_PORT" $EXCLUDE_PARAMS "$LOCAL_DIR" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
for dir in "${IGNORE_TIMES_DIRS[@]}"; do
    rsync -avz --dry-run --ignore-times --delete -e "ssh -p $REMOTE_PORT" "$LOCAL_DIR/$dir" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$dir"
done

# Preguntar antes de hacer deploy real
read -p "¿Ejecutar deploy real ahora? (s/n): " CONFIRM
if [[ "$CONFIRM" =~ ^[sS]$ ]]; then
    echo "=== DEPLOY REAL ==="
    # Rsync normal
    rsync_general
    # Rsync ignorando timestamps en carpetas críticas
    rsync_ignore_times

    # Limpiar caches de Laravel automáticamente
    ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && php artisan config:clear && php artisan cache:clear && php artisan route:clear && php artisan view:clear"

    echo "Deploy completado!"
else
    echo "Deploy cancelado."
fi
