// Detección de enlaces: URLs (http, www) y dominios sueltos (ej: "mitienda.cl", "bit.ly/xyz").

// Terminaciones que casi siempre son un sitio web: basta con "algo.cl".
const STRONG_TLDS = [
  'com', 'cl', 'net', 'org', 'info', 'biz', 'io', 'ly', 'gl', 'app', 'dev', 'page', 'site', 'online',
  'store', 'shop', 'tienda', 'link', 'click', 'live', 'xyz', 'top', 'vip', 'club', 'fun', 'lat', 'tech',
  'website', 'ws', 'gg', 'tv', 'ai', 'tk', 'ml', 'ga', 'cf', 'gq', 'cc', 'mobi', 'bet', 'casino',
  'download', 'stream', 'tube', 'bz', 'nu', 'pw', 'fm', 'gd', 'gs', 'ms', 'nf', 'sh', 'tc', 'vg', 'mx',
  'br', 'uk', 'eu', 'ru', 'cn', 'fr', 'ink', 'email', 'digital', 'agency', 'network', 'solutions',
];
// Terminaciones que también son palabras o errores de tipeo comunes ("hola.la casa",
// "disponible.de"). Solo cuentan como enlace si llevan algo después de "/" (ej: "wa.me/569...").
const WEAK_TLDS = [
  'me', 'co', 'es', 'de', 'la', 'in', 'to', 'us', 'id', 'pe', 'ar', 'it', 'su', 'st', 'one', 'win',
  'web', 'video', 'chat', 'pro', 'bio', 'news', 'media', 'social', 'world', 'today', 'market',
  'group', 'center', 'money', 'cash', 'global', 'studio', 'services', 'ee', 'ph', 'name', 've', 'bo',
  'uy', 'py', 'ec', 'cr', 'do', 'gt', 'hn', 'ni', 'pa', 'sv', 'cu', 'pr',
];

const LABELS = String.raw`(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+`;
const NOT_BEFORE = String.raw`(?<![@\w.-])`;
const NOT_AFTER = String.raw`(?![a-z0-9-])`;

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const STRONG_RE = new RegExp(
  String.raw`${NOT_BEFORE}${LABELS}(?:${STRONG_TLDS.join('|')})${NOT_AFTER}(?:[/:?#]\S*)?`, 'i');
const WEAK_RE = new RegExp(
  String.raw`${NOT_BEFORE}${LABELS}(?:${WEAK_TLDS.join('|')})/\S+`, 'i');
// Correos electrónicos: se permiten (comunes en ofertas de trabajo).
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Devuelve el primer enlace encontrado o null. */
export function findLink(text) {
  if (!text) return null;
  const clean = String(text).replace(EMAIL_RE, ' ');
  for (const re of [URL_RE, STRONG_RE, WEAK_RE]) {
    const m = re.exec(clean);
    // El nombre debe tener alguna letra (descarta cosas como "1.500.000").
    if (m && /[a-z]/i.test(m[0].split('.')[0])) return m[0];
  }
  return null;
}
