// Lee la configuración del archivo .env (claves privadas).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`\n❌ Falta "${name}" en el archivo .env.`);
    console.error('   Ejecuta "npm run configurar" (o doble clic en CONFIGURAR.bat) para crearlo.\n');
    process.exit(1);
  }
  return value;
}

export const config = {
  supabaseUrl: required('SUPABASE_URL').replace(/\/+$/, ''),
  supabaseKey: required('SUPABASE_SECRET_KEY'),
  authFolder: path.resolve(root, process.env.AUTH_FOLDER?.trim() || 'auth'),
  // Nivel de detalle de los mensajes internos de WhatsApp (silent, error, warn, info, debug).
  // Número del bot para vincular con código de 8 letras en vez de QR (ej: 56994487026). Vacío = usar QR.
  pairingPhone: (process.env.PAIRING_PHONE ?? '').replace(/\D/g, '') || null,
  baileysLogLevel: process.env.BAILEYS_LOG_LEVEL?.trim() || 'silent',
  version: '1.0.0',
};

if (!/^https:\/\/.+/.test(config.supabaseUrl)) {
  console.error('\n❌ SUPABASE_URL debe empezar con https:// (ej: https://xxxx.supabase.co)\n');
  process.exit(1);
}
