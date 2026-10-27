// Asistente para crear el archivo .env con tus claves de Supabase (sin editar archivos a mano).
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('\n🔧 Configuración del bot\n');
console.log('Pega cada dato y presiona Enter. (En esta ventana se pega con clic derecho o Ctrl+V)\n');

if (fs.existsSync(envPath)) {
  const again = await rl.question('Ya existe un archivo .env. ¿Reemplazarlo? (s/n): ');
  if (!/^s/i.test(again.trim())) {
    console.log('No se cambió nada.');
    process.exit(0);
  }
}

async function ask(question, check, hint) {
  for (;;) {
    const value = (await rl.question(question)).trim().replace(/^["']|["']$/g, '');
    if (check(value)) return value;
    console.log(`   ❌ ${hint}\n`);
  }
}

const url = await ask(
  '1) Project URL de Supabase (https://xxxx.supabase.co): ',
  (v) => /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(v),
  'Debe ser como https://abcdefgh.supabase.co',
);
const key = await ask(
  '2) Secret key de Supabase (sb_secret_... o la service_role): ',
  (v) => v.startsWith('sb_secret_') || (v.startsWith('eyJ') && v.length > 100),
  'Esa no parece la clave secreta. Debe empezar con sb_secret_ (no uses la publishable).',
);
rl.close();

fs.writeFileSync(envPath, [
  '# Claves privadas del bot. NO compartir ni subir a GitHub.',
  `SUPABASE_URL=${url.replace(/\/+$/, '')}`,
  `SUPABASE_SECRET_KEY=${key}`,
  '',
].join('\n'));

console.log('\n✅ Listo. Se guardó el archivo .env');
console.log('   Ahora inicia el bot (doble clic en INICIAR-BOT.bat o "npm start").\n');
