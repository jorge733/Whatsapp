# Etapa 2: el bot de WhatsApp en tu computador (Windows)

## Qué necesitas
- El celular con el **chip aparte** y WhatsApp funcionando (será el bot).
- Tu celular personal.
- Tu Bloc de notas con la **URL** y la **SECRETA** de Supabase (Etapa 1).

## 1. Instalar Node.js (el programa que hace funcionar el bot)
1. Entra a <https://nodejs.org>.
2. Toca el botón verde que dice **LTS** y descarga el instalador para Windows (`.msi`).
3. Ábrelo y toca **Next** en todo (deja todo como viene), luego **Install** y **Finish**.

## 2. Descargar el proyecto
1. Con tu sesión de GitHub iniciada, abre:
   <https://github.com/jorge733/Whatsapp/archive/refs/heads/claude/festive-hopper-8l4sh9.zip>
2. Se descarga un archivo `.zip`. Ve a **Descargas**, haz clic derecho sobre él → **Extraer todo…** →
   elige **Documentos** → **Extraer**.
3. Quedará una carpeta como `Documentos\Whatsapp-claude-festive-hopper-8l4sh9`. Adentro está la carpeta **bot**.

## 3. Poner tus claves
1. Abre la carpeta **bot** y haz doble clic en **CONFIGURAR.bat**.
   - Si Windows muestra "Windows protegió su PC": toca **Más información** → **Ejecutar de todas formas**.
2. La primera vez instala componentes (1–3 minutos).
3. Te pedirá:
   - **Project URL** → pega la URL (clic derecho para pegar) y Enter.
   - **Secret key** → pega la SECRETA y Enter.
4. Debe decir **"Listo. Se guardó el archivo .env"**. Presiona cualquier tecla para cerrar.

## 4. Crear el grupo de prueba (desde el celular del BOT)
1. En el celular del bot: WhatsApp → **Nuevo grupo** → agrega **tu número personal** → nombre: `Prueba bot`.
2. Así el bot es administrador y tú eres un miembro normal (los admins están exentos de las reglas,
   por eso tu número **no** debe ser admin en este grupo).

## 5. Iniciar el bot y escanear el QR
1. En la carpeta **bot**, doble clic en **INICIAR-BOT.bat**.
2. Aparecerá un **código QR** en la ventana negra.
   (Si se ve deformado, abre la imagen **qr.png** que aparece en la carpeta bot.)
3. En el celular del **bot**: WhatsApp → **⋮** (Android) o **Configuración** (iPhone) →
   **Dispositivos vinculados** → **Vincular un dispositivo** → escanea el QR.
4. En la ventana debe aparecer **"Conectado a WhatsApp"** y la lista de grupos.

⚠️ **No cierres esa ventana**: si la cierras, el bot se apaga. Tampoco dejes que el computador
se suspenda. (En la Etapa 4 lo pasaremos a un servidor que funciona 24/7.)

## 6. Probar
Desde tu celular **personal**, escríbele al número del bot por privado:

| Escribe | Debe pasar |
|---|---|
| `/ayuda` | Te responde con la lista de comandos |
| `/grupos` | Te muestra los grupos numerados |
| `/activar 1 ventas` | (usa el número que tenga "Prueba bot") Empieza a moderar ese grupo |
| `/estado` | Te muestra el estado y el resumen de hoy |

Luego, en el grupo **Prueba bot**, desde tu celular personal, escribe `mira mitienda.cl`.
Como el **modo prueba** está activado, el bot **no** borra nada: en menos de 1 minuto te llega
un mensaje privado "🧪 Modo prueba — esto es lo que habría hecho…".

Prueba real (opcional):
1. Escribe al bot `/prueba off`.
2. En el grupo escribe otro enlace → el bot lo borra y te advierte.
3. Escribe al bot `/reset +569XXXXXXXX` (tu número) para borrar esa advertencia.
4. Escribe al bot `/prueba on` para volver al modo prueba.

En Supabase → Table Editor → **action_log** verás todo lo que hizo el bot.

## Si algo falla
- **"Falta SUPABASE_URL"** → ejecuta de nuevo CONFIGURAR.bat.
- **"No se pudo leer la tabla settings"** → la URL o la clave secreta están mal copiadas.
- **El bot no responde comandos** → revisa que `owner_phone` en la tabla `settings` sea tu número
  personal (ej: `56912345678`).
- **Para volver a vincular WhatsApp desde cero** → cierra la ventana, borra la carpeta **auth**
  dentro de **bot** e inicia de nuevo.
