#!/bin/bash

# ==========================================================
# Script para ejecutar migraciones en servidor remoto
# ==========================================================

# Configuración
REMOTE_USER="u576759887"
REMOTE_HOST="proudactive.iradogelateria.com.br"
REMOTE_PORT="65002"
REMOTE_DIR="/home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/"

echo "=== EJECUTANDO MIGRACIONES EN SERVIDOR REMOTO ==="
echo ""
echo "Este script ejecutará las siguientes acciones:"
echo "1. Conectarse al servidor vía SSH"
echo "2. Navegar al directorio de Laravel"
echo "3. Ejecutar php artisan migrate"
echo ""

read -p "¿Continuar? (s/n): " CONFIRM

if [[ "$CONFIRM" =~ ^[sS]$ ]]; then
    echo ""
    echo "Ejecutando migraciones..."
    echo ""
    
    ssh -p $REMOTE_PORT "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/
php artisan migrate
echo ""
echo "Migraciones completadas!"
EOF
    
    echo ""
    echo "✅ Proceso finalizado"
else
    echo "Operación cancelada."
fi

