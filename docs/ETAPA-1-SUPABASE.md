# Etapa 1 — Base de datos en Supabase

Supabase es la base de datos que comparten el bot y el panel. El plan gratis alcanza de sobra.

## 1. Crear la cuenta
1. Entra a <https://supabase.com> y toca **Start your project**.
2. Regístrate con tu correo (o con GitHub si ya tienes cuenta). Confirma el correo que te llega.

## 2. Crear el proyecto
1. Toca **New project**.
2. Completa:
   - **Name:** `moderacion-whatsapp`
   - **Database Password:** toca **Generate a password**, cópiala y guárdala en un lugar seguro (no la vamos a usar seguido, pero no la pierdas).
   - **Region:** **South America (São Paulo)** — es la más cercana a Chile.
   - **Plan:** Free.
3. Toca **Create new project** y espera 1–2 minutos a que termine.

## 3. Crear las tablas
1. Abre el archivo [`supabase/schema.sql`](../supabase/schema.sql) en GitHub y copia **todo** su contenido (botón de copiar, arriba a la derecha del archivo).
2. En Supabase, menú de la izquierda → **SQL Editor** → **New query**.
3. Pega el contenido y toca **Run** (o Ctrl+Enter).
4. Si aparece un aviso sobre "destructive operations", toca **Run this query**: es normal, el archivo no borra datos.
5. Abajo debe aparecer: **Base de datos lista**.

## 4. Crear tu usuario del panel (y cerrar el registro a otros)
1. Menú izquierdo → **Authentication** → **Sign In / Providers**.
   Desactiva **Allow new users to sign up** y guarda. Así nadie más puede crearse una cuenta.
2. **Authentication** → **Users** → **Add user** → **Create new user**.
   Escribe tu correo y una contraseña, marca **Auto Confirm User** y crea.
3. Vuelve a **SQL Editor** → **New query**, pega esto (con tu correo y tu número) y toca **Run**:

   ```sql
   insert into app_admins (email) values ('TU_CORREO@gmail.com');
   update settings set owner_phone = '569XXXXXXXX' where id = 1;
   ```

   El número va sin `+` ni espacios, por ejemplo `56912345678`. Es tu número **personal** (el dueño), no el del chip del bot.

## 5. Copiar las claves
Menú izquierdo → **Project Settings** (engranaje) → **API Keys**. Copia en una nota privada de tu computador:

| Qué | Dónde está | Se usa en |
|---|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | Botón **Connect** arriba, o Project Settings → Data API | bot y panel |
| **Publishable key** (`sb_publishable_...`) | API Keys | panel (navegador) |
| **Secret key** (`sb_secret_...`) | API Keys → toca **Reveal** | bot y servidor del panel |

Si tu proyecto muestra las claves antiguas (pestaña *Legacy API keys*): `anon` = publishable y `service_role` = secret. Cualquiera de las dos sirve.

⚠️ La **Secret key** da acceso total a la base de datos. No la compartas con nadie, no la pegues en chats ni en GitHub. En la Etapa 2 la pondrás en un archivo `.env` que nunca se sube.

## 6. Comprobar que quedó bien
- Menú izquierdo → **Table Editor**: deben aparecer 12 tablas (`action_log`, `app_admins`, `blacklist`, `bot_status`, `daily_counters`, `groups`, `lid_map`, `posts`, `review_cases`, `rule_presets`, `settings`, `warnings`).
- En `settings` hay una fila con `test_mode = true` (modo prueba activado) y tu número en `owner_phone`.
- En `rule_presets` hay 3 filas: ventas, trabajos y servicios.
- Cada tabla muestra la etiqueta **RLS enabled** (no debe decir "Unrestricted").

## Nota sobre el plan gratis
Supabase pausa los proyectos gratis que pasan 7 días sin uso. Cuando el bot esté funcionando escribe en la base de datos cada minuto, así que no se pausará. Si alguna vez se pausa, entra a supabase.com y toca **Restore**.
