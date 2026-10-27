#!/data/data/com.termux/files/usr/bin/bash
# Descarga la última versión del bot y lo reinicia.
# Uso:  bash ~/Whatsapp/bot/scripts/termux-actualizar.sh
set -e
cd "$(dirname "$0")/.."
git pull
npm ci --omit=dev --omit=peer
pm2 restart bot-whatsapp
echo "✅ Bot actualizado y reiniciado."
