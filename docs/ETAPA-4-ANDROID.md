# Etapa 4: el bot 24/7 en un celular Android (sin tarjeta de crédito)

El bot corre dentro del mismo celular que tiene el chip del bot (Moto g34), con **Termux**
(una app que permite ejecutar programas) y **pm2** (mantiene el bot encendido y lo reinicia si se cae).

## 0. Antes de empezar
1. **Apaga el bot del computador**: cierra la ventana negra.
2. En el celular del bot: WhatsApp → **⋮** → **Dispositivos vinculados** → toca el dispositivo
   del computador (ej: "Ubuntu" / "Chrome") → **Cerrar sesión**.
3. Deja el celular **enchufado** y con **WiFi**.

## 1. Instalar Termux y Termux:Boot (desde F-Droid, no desde Play Store)
1. En el celular, abre Chrome y entra a <https://f-droid.org/es/packages/com.termux/>.
2. Baja hasta **"Descargar APK"** (la versión más reciente) y ábrelo.
   Si Android pregunta, permite **"Instalar apps desconocidas"** para Chrome.
3. Repite con <https://f-droid.org/es/packages/com.termux.boot/> (Termux:Boot).
4. Abre **Termux:Boot** una vez (no muestra nada, es normal) y ciérralo.

## 2. Evitar que Android apague el bot
1. **Ajustes → Apps → Termux → Batería → Sin restricciones.**
2. Haz lo mismo con **Termux:Boot**.
3. (Recomendado) **Ajustes → Batería → Protección de batería / Carga optimizada**: actívala para que
   la batería no sufra por estar siempre enchufada.

## 3. Instalar el bot (3 comandos)
Abre **Termux** y escribe (o pega con pulsación larga → Pegar) cada línea, presionando Enter:

```
pkg update -y && pkg install -y git
git clone https://github.com/jorge733/Whatsapp.git
bash Whatsapp/bot/scripts/termux-instalar.sh
```

El tercer comando tarda varios minutos. Si pregunta algo con `[Y/n]`, escribe `y` y Enter.
Al final te pide:
1. **Project URL** de Supabase.
2. **Secret key** de Supabase (cópiala desde supabase.com → Project Settings → API Keys en el navegador
   del celular).
3. **Número del bot** → escribe `56994487026` (así se vincula con código, sin QR).

## 4. Vincular WhatsApp con el código
1. Escribe en Termux: `pm2 logs bot-whatsapp`
2. Aparece **CÓDIGO PARA VINCULAR WHATSAPP: ABCD-1234** (también se ve en el **Inicio del panel**).
3. Abre WhatsApp → **⋮** → **Dispositivos vinculados** → **Vincular un dispositivo** →
   **Vincular con el número de teléfono** → escribe el código.
4. En Termux debe aparecer **Conectado a WhatsApp**. El panel mostrará **Conectado**.

Si el código vence antes de escribirlo, el bot genera uno nuevo en ~1 minuto.

## Cómo probar que funciona
- El panel muestra **Conectado**.
- Escríbele `/estado` al bot desde tu número personal: responde.
- **Reinicia el celular**: en 1–2 minutos el panel vuelve a mostrar **Conectado** (arranque automático).

## Comandos útiles en Termux
| Comando | Para qué |
|---|---|
| `pm2 logs bot-whatsapp` | Ver lo que hace el bot (salir: CTRL + C) |
| `pm2 restart bot-whatsapp` | Reiniciar el bot |
| `pm2 stop bot-whatsapp` | Apagar el bot |
| `bash Whatsapp/bot/scripts/termux-actualizar.sh` | Descargar la última versión y reiniciar |
