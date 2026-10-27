# Moderación automática para la comunidad de WhatsApp

Sistema gratuito para moderar los grupos de la comunidad:

| Carpeta | Qué es | Dónde corre |
|---|---|---|
| `bot/` | Bot de WhatsApp (Node.js + Baileys + pm2) | Tu computador → Oracle Cloud Always Free |
| `panel/` | Panel web de administración (Next.js, PWA) | Vercel (gratis) |
| `supabase/` | Tablas y seguridad de la base de datos | Supabase (gratis) |

Zona horaria: **America/Santiago**. Todas las claves van en archivos `.env` que **nunca** se suben a GitHub.

## Etapas

- [x] **Etapa 1** — Base de datos en Supabase → [guía](docs/ETAPA-1-SUPABASE.md)
- [x] **Etapa 2** — Bot conectado a WhatsApp (prueba en tu computador) → [guía](docs/ETAPA-2-BOT.md)
- [ ] **Etapa 3** — Panel web publicado en Vercel
- [ ] **Etapa 4** — Bot 24/7 en Oracle Cloud con pm2

## Tablas principales

| Tabla | Para qué |
|---|---|
| `settings` | Ajustes generales: modo prueba, vencimiento de advertencias, faltas para expulsar, textos |
| `bot_status` | Latido del bot y estado de la conexión con WhatsApp |
| `rule_presets` | Plantillas de reglas: Ventas, Trabajos, Servicios |
| `groups` | Grupos donde está el bot y sus reglas |
| `warnings` | Advertencias por persona y grupo (vencen solas) |
| `posts` | Publicaciones aceptadas (para límites semanales) |
| `action_log` | Registro de todo lo que hizo (o habría hecho) el bot |
| `blacklist` | Lista negra común |
| `review_cases` | Casos dudosos para que decidas tú |
| `lid_map` | Equivalencia entre identificadores ocultos (LID) y números reales |

## Bot: cómo está organizado (`bot/src`)

| Archivo | Qué hace |
|---|---|
| `index.js` | Arranca todo |
| `whatsapp.js` | Conexión con WhatsApp, QR y reconexión |
| `moderator.js` | Revisa cada mensaje de los grupos moderados |
| `rules/` | Una regla por archivo (horario, enlaces, fotos, publicaciones). Aquí se sumará la revisión con IA |
| `sanctions.js` | Advertencia → última advertencia → expulsión, modo prueba |
| `joins.js` | Ingresos: lista negra y solo números chilenos |
| `identity.js` | Número real detrás de los identificadores ocultos (LID) |
| `reviews.js` | Casos para revisar |
| `commands.js` | Comandos por WhatsApp del dueño |
| `summary.js` | Resumen diario de las 21:30 |
| `actions.js` | Acciones en WhatsApp con pausas entre cada una |

Pruebas automáticas: `cd bot && npm test`.
