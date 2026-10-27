#!/data/data/com.termux/files/usr/bin/bash
# Instalador del bot en un celular Android con Termux.
# Uso:  bash ~/Whatsapp/bot/scripts/termux-instalar.sh
set -e
BOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BOT_DIR"

echo ""
echo "== 1/5  Instalando Node.js (puede tardar varios minutos) =="
yes | pkg upgrade -y -o Dpkg::Options::=--force-confnew || true
pkg install -y nodejs-lts

echo ""
echo "== 2/5  Instalando componentes del bot =="
npm ci --omit=dev --omit=peer

echo ""
echo "== 3/5  Instalando pm2 (mantiene el bot encendido) =="
npm install -g pm2

echo ""
echo "== 4/5  Claves de Supabase =="
if [ -f .env ]; then
  echo "Ya existe el archivo .env (para cambiarlo: npm run configurar)"
else
  npm run configurar
fi

echo ""
echo "== 5/5  Inicio automático al prender el celular =="
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/iniciar-bot.sh <<BOOT
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd "$BOT_DIR"
pm2 resurrect || pm2 start ecosystem.config.cjs
BOOT
chmod +x ~/.termux/boot/iniciar-bot.sh

termux-wake-lock || true
pm2 delete bot-whatsapp >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "✅ Bot instalado y encendido."
echo "   Ver lo que hace el bot:   pm2 logs bot-whatsapp"
echo "   (para salir de esa vista: toca CTRL y luego C)"
