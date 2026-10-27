// Simulación completa de moderación con un WhatsApp y una base de datos falsos.
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

const src = (f) => new URL(`../src/${f}`, import.meta.url).href;

// ---------- Base de datos falsa ----------
const db = { warnings: [], posts: [], log: [], reviews: [], blacklist: [], lid: new Map() };
let nextId = 1;
const dbMock = {
  supabase: { channel: () => ({ on() { return this; }, subscribe() {} }) },
  fetchSettings: async () => null,
  fetchGroups: async () => null,
  fetchBlacklist: async () => null,
  updateSettings: async () => null,
  updateBotStatus: async () => null,
  upsertGroups: async () => [],
  markGroupsAbsent: async () => null,
  updateGroup: async () => null,
  logAction: async (row) => { db.log.push(row); },
  countActiveWarnings: async (g, who, t) => db.warnings.filter((w) => w.group_id === g && w.phone === who && w.test_mode === t).length,
  addWarning: async (row) => { db.warnings.push(row); },
  activeWarningsFor: async () => [],
  clearWarnings: async () => null,
  recentPosts: async (g, who, since) => db.posts.filter((p) => p.group_id === g && p.phone === who && p.created_at >= since),
  addPost: async (row) => { const r = { id: nextId++, ...row }; db.posts.push(r); return { id: r.id }; },
  updatePost: async () => null,
  addToBlacklist: async (phone, reason, source) => { db.blacklist.push({ phone, reason, source }); },
  removeFromBlacklist: async () => [],
  openReviewCase: async (row) => { db.reviews.push(row); return { id: nextId++ }; },
  fetchReviewCases: async () => [],
  updateReviewCase: async () => null,
  saveLidMappings: async () => null,
  lookupLid: async (lid) => db.lid.get(lid) ?? null,
  incrementChecked: async () => null,
  dailySummary: async () => [],
  summarySentOn: async () => false,
  countPendingReviews: async () => 0,
};
mock.module(src('db.js'), { namedExports: dbMock });

// ---------- WhatsApp falso ----------
const calls = [];
const GROUP = '120363@g.us';
const ADMIN = '56900000001@s.whatsapp.net';
const fakeSock = {
  user: { id: '56900000099:5@s.whatsapp.net', lid: '999@lid' },
  signalRepository: { lidMapping: { getPNForLID: async () => null, getLIDForPN: async (pn) => (pn === '56900000001@s.whatsapp.net' ? '5005@lid' : null) } },
  groupMetadata: async (jid) => ({
    id: jid, subject: 'Ventas zona oriente',
    participants: [
      { id: '999@lid', phoneNumber: '56900000099@s.whatsapp.net', admin: 'admin' },
      { id: ADMIN, admin: 'admin' },
      { id: '111@lid', phoneNumber: '56911111111@s.whatsapp.net' },
    ],
  }),
};
let notices = [];
mock.module(src('actions.js'), {
  namedExports: {
    setSocket() {}, getSocket: () => fakeSock, getSentMessage() {},
    deleteMessage: async (g, key) => { calls.push(['delete', key.id]); return true; },
    kick: async (g, jid) => { calls.push(['kick', jid]); return true; },
    sendText: async (jid, text) => { calls.push(['send', text]); return true; },
    notifyOwner: async (text) => { calls.push(['owner', text]); return true; },
    testModeNotice: (line) => { notices.push(line); },
  },
});

const { state } = await import(src('state.js'));
const { handleGroupMessage } = await import(src('moderator.js'));
const { handleParticipantsUpdate } = await import(src('joins.js'));
const { refreshGroup } = await import(src('groups.js'));
const { handlePrivateMessage } = await import(src('commands.js'));

const RULES = {
  only_chile: { enabled: true },
  no_links: { enabled: true, reason: 'no se permiten enlaces en este grupo' },
  schedule: { enabled: true, start: '08:00', end: '21:00', reason: 'solo se puede publicar entre las {start} y las {end} hrs' },
  max_photos: { enabled: true, max: 3, album_window_seconds: 20, reason: 'se permiten máximo {max} fotos por publicación' },
  post_limit: { enabled: true, max_posts: 3, window_days: 7, no_consecutive_days: false, reason: 'se permiten máximo {max_posts} publicaciones cada {window_days} días' },
};
const group = { id: 'g1', wa_jid: GROUP, wa_name: 'Ventas zona oriente', enabled: true, present: true, preset: 'ventas', rules: RULES };

// Hora "dentro de horario": hoy 12:00 en Chile. Se usan horas recientes para que el bot no las descarte por antiguas.
const nowSec = () => Math.floor(Date.now() / 1000);
let seq = 0;
function msg(sender, message, { ts = nowSec(), alt } = {}) {
  return { key: { remoteJid: GROUP, id: `M${++seq}`, participant: sender, participantAlt: alt, fromMe: false }, messageTimestamp: ts, message };
}

beforeEach(async () => {
  Object.assign(db, { warnings: [], posts: [], log: [], reviews: [], blacklist: [] });
  calls.length = 0;
  notices = [];
  state.settings = {
    test_mode: false, strikes_to_kick: 3, auto_blacklist_on_kick: false, owner_phone: '56900000001',
    msg_warning: 'Hola {usuario}, motivo: {motivo}', msg_final_warning: 'ULTIMA {usuario}: {motivo}', msg_kick: '{usuario} fuera',
  };
  state.groupsByJid = new Map([[GROUP, structuredClone(group)]]);
  state.blacklist = new Map();
  await refreshGroup(GROUP);
});

// Para no depender de la hora real, se desactiva el horario salvo en su propia prueba.
function withoutSchedule() {
  state.groupsByJid.get(GROUP).rules.schedule.enabled = false;
}

test('enlaces: advertencia → última advertencia → expulsión', async () => {
  withoutSchedule();
  const u = '222@lid';
  // Separados por más de 2 minutos para que cuenten como faltas distintas.
  const t = nowSec() - 600;
  await handleGroupMessage(msg(u, { conversation: 'compra en mitienda.cl' }, { ts: t, alt: '56922222222@s.whatsapp.net' }));
  await handleGroupMessage(msg(u, { conversation: 'www.otra.com' }, { ts: t + 200, alt: '56922222222@s.whatsapp.net' }));
  await handleGroupMessage(msg(u, { conversation: 'bit.ly/x' }, { ts: t + 400, alt: '56922222222@s.whatsapp.net' }));
  const kinds = calls.map((c) => c[0]);
  assert.deepEqual(kinds, ['delete', 'send', 'delete', 'send', 'delete', 'send', 'kick']);
  assert.match(calls[1][1], /^Hola @222, motivo: no se permiten enlaces/);
  assert.match(calls[3][1], /^ULTIMA/);
  assert.equal(calls[6][1], u);
  assert.equal(db.warnings[0].phone, '56922222222'); // número real gracias al identificador alternativo
});

test('administradores exentos', async () => {
  withoutSchedule();
  await handleGroupMessage(msg(ADMIN, { conversation: 'www.admin.cl' }));
  assert.equal(calls.length, 0);
});

test('álbum de 5 fotos: se borran la 4ª y 5ª, una sola advertencia, una sola publicación', async () => {
  withoutSchedule();
  const u = '56933333333@s.whatsapp.net';
  const t = nowSec() - 30;
  for (let i = 0; i < 5; i++) await handleGroupMessage(msg(u, { imageMessage: {} }, { ts: t + i }));
  assert.deepEqual(calls.map((c) => c[0]), ['delete', 'send', 'delete']);
  assert.equal(db.warnings.length, 1);
  assert.equal(db.posts.length, 1);
});

test('límite de 3 publicaciones en 7 días; las respuestas no cuentan', async () => {
  withoutSchedule();
  const u = '56944444444@s.whatsapp.net';
  const t = nowSec() - 3000;
  for (let i = 0; i < 3; i++) await handleGroupMessage(msg(u, { conversation: `vendo cosa ${i}` }, { ts: t + i * 600 }));
  await handleGroupMessage(msg(u, { extendedTextMessage: { text: 'sí, disponible', contextInfo: { stanzaId: 'Q', quotedMessage: {} } } }, { ts: t + 1900 }));
  assert.equal(calls.length, 0);
  await handleGroupMessage(msg(u, { conversation: 'vendo cosa 4' }, { ts: t + 2400 }));
  assert.deepEqual(calls.map((c) => c[0]), ['delete', 'send']);
  assert.match(calls[1][1], /máximo 3 publicaciones cada 7 días/);
  assert.equal(db.posts.length, 3);
});

test('servicios: no se puede publicar en días seguidos', async () => {
  withoutSchedule();
  const g = state.groupsByJid.get(GROUP);
  g.rules.post_limit.no_consecutive_days = true;
  const u = '56955555555@s.whatsapp.net';
  const { santiagoParts, addDays } = await import(src('time.js'));
  db.posts.push({ group_id: 'g1', phone: '56955555555', created_at: new Date(Date.now() - 86_400_000).toISOString(),
    local_day: addDays(santiagoParts().day, -1) });
  await handleGroupMessage(msg(u, { conversation: 'ofrezco gasfitería' }));
  assert.match(calls[1][1], /dos días seguidos/);
});

test('fuera de horario: un álbum de 3 fotos es UNA falta', async () => {
  const g = state.groupsByJid.get(GROUP);
  // Horario imposible para que cualquier hora quede fuera.
  g.rules.schedule = { enabled: true, start: '03:00', end: '03:01', reason: 'solo entre {start} y {end}' };
  const { santiagoParts } = await import(src('time.js'));
  if (santiagoParts().hhmm === '03:00') return;
  const u = '56966666666@s.whatsapp.net';
  const t = nowSec() - 10;
  for (let i = 0; i < 3; i++) await handleGroupMessage(msg(u, { imageMessage: {} }, { ts: t + i }));
  assert.deepEqual(calls.map((c) => c[0]), ['delete', 'send', 'delete', 'delete']);
  assert.equal(db.warnings.length, 1);
  assert.equal(db.posts.length, 0);
});

test('modo prueba: no borra ni expulsa, solo registra y avisa', async () => {
  withoutSchedule();
  state.settings.test_mode = true;
  await handleGroupMessage(msg('56977777777@s.whatsapp.net', { conversation: 'mira x.cl' }));
  assert.equal(calls.length, 0);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /Habría hecho: borrar \+ advertencia/);
  assert.ok(db.log.every((r) => r.test_mode === true));
  assert.equal(db.warnings[0].test_mode, true);
});

test('ingresos: extranjero expulsado, LID desconocido a revisar, lista negra expulsada', async () => {
  state.blacklist = new Map([['56988888888', { phone: '56988888888' }]]);
  await handleParticipantsUpdate({ id: GROUP, action: 'add', participants: [{ id: '15551234567@s.whatsapp.net' }] });
  await handleParticipantsUpdate({ id: GROUP, action: 'add', participants: [{ id: '777@lid' }] });
  await handleParticipantsUpdate({ id: GROUP, action: 'add', participants: [{ id: '888@lid', phoneNumber: '56988888888@s.whatsapp.net' }] });
  await handleParticipantsUpdate({ id: GROUP, action: 'add', participants: [{ id: '56912121212@s.whatsapp.net' }] });
  assert.deepEqual(calls.filter((c) => c[0] === 'kick').map((c) => c[1]), ['15551234567@s.whatsapp.net', '888@lid']);
  assert.equal(db.reviews.length, 1);
  assert.equal(db.reviews[0].participant_jid, '777@lid');
});

test('LID resuelto por la tabla lid_map', async () => {
  db.lid.set('4242', '5491112345678');
  await handleParticipantsUpdate({ id: GROUP, action: 'add', participants: [{ id: '4242@lid' }] });
  assert.deepEqual(calls.filter((c) => c[0] === 'kick').map((c) => c[1]), ['4242@lid']);
  assert.equal(db.reviews.length, 0);
});

test('expulsión por faltas con lista negra automática', async () => {
  withoutSchedule();
  state.settings.strikes_to_kick = 1;
  state.settings.auto_blacklist_on_kick = true;
  await handleGroupMessage(msg('56912345000@s.whatsapp.net', { conversation: 'x.cl' }));
  assert.deepEqual(calls.map((c) => c[0]), ['delete', 'send', 'kick']);
  assert.equal(db.blacklist[0].phone, '56912345000');
  assert.equal(db.blacklist[0].source, 'auto');
});

test('editar un mensaje para agregar un enlace', async () => {
  withoutSchedule();
  const m = msg('56912340000@s.whatsapp.net', { protocolMessage: { type: 14, key: { id: 'ORIG' }, editedMessage: { conversation: 'ahora con x.cl' } } });
  await handleGroupMessage(m);
  assert.deepEqual(calls[0], ['delete', 'ORIG']);
});

test('comandos del dueño aunque WhatsApp oculte su número (LID)', async () => {
  const dm = (from, text) => ({ key: { remoteJid: from, id: `P${++seq}`, fromMe: false }, message: { conversation: text } });
  await handlePrivateMessage(dm('5005@lid', '/ayuda'));
  assert.equal(calls.length, 1);
  assert.match(calls[0][1], /Comandos disponibles/);
  await handlePrivateMessage(dm('56900000001@s.whatsapp.net', '/ayuda'));
  assert.equal(calls.length, 2);
  await handlePrivateMessage(dm('6006@lid', '/ayuda')); // otra persona: se ignora
  await handlePrivateMessage(dm('56977770000@s.whatsapp.net', '/prueba off'));
  assert.equal(calls.length, 2);
});
