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
    "vendor"
    "node_modules"
    ".git"
    "storage"
)

# Construir la cadena de exclusión para rsync
EXCLUDE_PARAMS=""
for item in "${EXCLUDES[@]}"; do
    EXCLUDE_PARAMS+="--exclude=$item "
done

# Dry run para ver qué se subiría/eliminaría
echo "=== DRY RUN ==="
rsync -avz --dry-run --delete -e "ssh -p $REMOTE_PORT" $EXCLUDE_PARAMS "$LOCAL_DIR" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

# Preguntar antes de hacer deploy real
read -p "¿Ejecutar deploy real ahora? (s/n): " CONFIRM
if [[ "$CONFIRM" =~ ^[sS]$ ]]; then
    echo "=== DEPLOY REAL ==="
    rsync -avz --delete -e "ssh -p $REMOTE_PORT" $EXCLUDE_PARAMS "$LOCAL_DIR" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
    echo "Deploy completado!"
else
    echo "Deploy cancelado."
fi
