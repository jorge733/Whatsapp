// Configuración de pm2 (se usa en el servidor, Etapa 4): reinicia el bot si se cae.
module.exports = {
  apps: [
    {
      name: 'bot-whatsapp',
      script: 'src/index.js',
      cwd: __dirname,
      time: true,
      autorestart: true,
      restart_delay: 5000,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production', TZ: 'America/Santiago' },
    },
  ],
};
