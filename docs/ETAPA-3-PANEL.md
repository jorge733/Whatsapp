# Etapa 3: el panel web en Vercel

El panel usa solo la clave **pública** (publishable) de Supabase. La seguridad la dan tu login
y las reglas de la base de datos (RLS): sin tu correo y contraseña no se ve nada.
La clave secreta **no** se pone en Vercel.

## 1. Crear la cuenta de Vercel
1. Entra a <https://vercel.com/signup>.
2. Elige **Hobby** (gratis) y escribe tu nombre.
3. Toca **Continue with GitHub** y autoriza.

## 2. Importar el proyecto
1. En Vercel toca **Add New…** → **Project**.
2. Busca el repositorio **Whatsapp** y toca **Import**.
   - Si no aparece: toca **Adjust GitHub App Permissions** y dale acceso al repositorio.
3. En **Root Directory** toca **Edit**, elige la carpeta **panel** y **Continue**.
4. Abre **Environment Variables** y agrega dos:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | tu URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | tu clave **PUBLICA** (`sb_publishable_...`) |

5. Toca **Deploy** y espera 1–2 minutos.

## 3. Entrar al panel
1. Al terminar, toca **Continue to Dashboard** y luego **Visit** (o copia la dirección `https://….vercel.app`).
2. Entra con el correo y contraseña que creaste en Supabase (Etapa 1).

## 4. Instalarlo en el celular
- **Android (Chrome):** abre la dirección → **⋮** → **Agregar a la pantalla principal** / **Instalar app**.
- **iPhone (Safari):** abre la dirección → botón **Compartir** → **Agregar a pantalla de inicio**.

## Cómo probar que funciona
- **Inicio** muestra el bot **Conectado** (si el bot está encendido en tu computador).
- Apaga el bot (cierra la ventana negra): en 3 minutos Inicio muestra **Bot apagado** en rojo.
- **Ajustes** → cambia algo y guarda → el bot lo aplica en segundos.
- **Reglas** → aparecen tus grupos para elegir su tipo.

## Actualizaciones
Cada vez que se suba código nuevo a GitHub, Vercel publica la nueva versión solo.
