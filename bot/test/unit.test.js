import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLink } from '../src/links.js';
import { isWithinSchedule, santiagoParts, addDays, parseHHMM } from '../src/time.js';
import { normalizePhone, isChilean, formatPhone } from '../src/phone.js';
import { describeMessage, describeEdit } from '../src/content.js';

test('detecta enlaces y evita falsos positivos', () => {
  for (const t of ['www.x.cl', 'https://a.b', 'mitienda.cl', 'bit.ly/abc', 'wa.me/569123', 'VENDO.COM', 'facebook.com/x']) {
    assert.ok(findLink(t), t);
  }
  for (const t of ['3.500', 'Hola.la casa', 'disponible.de lunes', 'cv a juan@empresa.cl', '1.500.000', 'Ok.Gracias', '']) {
    assert.equal(findLink(t), null, t);
  }
});

test('horarios', () => {
  assert.equal(isWithinSchedule(8 * 60, '08:00', '21:00'), true);
  assert.equal(isWithinSchedule(7 * 60 + 59, '08:00', '21:00'), false);
  assert.equal(isWithinSchedule(21 * 60, '08:00', '21:00'), false);
  assert.equal(isWithinSchedule(20 * 60 + 59, '08:00', '21:00'), true);
  assert.equal(isWithinSchedule(23 * 60, '22:00', '06:00'), true); // cruza medianoche
  assert.equal(isWithinSchedule(10 * 60, 'mal', '21:00'), true); // configuración inválida: no castiga
  assert.equal(parseHHMM('9:05'), 545);
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('hora de Chile (incluye horario de verano)', () => {
  // 27-oct-2026 12:00 UTC = 09:00 en Santiago (UTC-3, horario de verano)
  assert.equal(santiagoParts(new Date('2026-10-27T12:00:00Z')).hhmm, '09:00');
  // 15-jun-2026 12:00 UTC = 08:00 en Santiago (UTC-4, horario de invierno)
  assert.equal(santiagoParts(new Date('2026-06-15T12:00:00Z')).hhmm, '08:00');
  assert.equal(santiagoParts(new Date('2026-10-28T02:30:00Z')).day, '2026-10-27');
});

test('números', () => {
  assert.equal(normalizePhone('+56 9 1234 5678'), '56912345678');
  assert.equal(normalizePhone('912345678'), '56912345678');
  assert.equal(normalizePhone('+1 (555) 123-4567'), '15551234567');
  assert.equal(normalizePhone('abc'), null);
  assert.equal(isChilean('56912345678'), true);
  assert.equal(isChilean('15551234567'), false);
  assert.equal(formatPhone('56912345678'), '+56 9 1234 5678');
});

test('lectura de mensajes', () => {
  assert.equal(describeMessage({ conversation: 'hola' }).text, 'hola');
  const img = describeMessage({ imageMessage: { caption: 'auto' }, messageContextInfo: { messageAssociation: { parentMessageKey: { id: 'ALB' } } } });
  assert.equal(img.isImage, true);
  assert.equal(img.albumParentId, 'ALB');
  assert.equal(describeMessage({ reactionMessage: { text: '👍' } }).ignored, true);
  const reply = describeMessage({ extendedTextMessage: { text: 'precio?', contextInfo: { stanzaId: 'X', quotedMessage: {} } } });
  assert.equal(reply.isReply, true);
  const edit = describeEdit({ protocolMessage: { type: 14, key: { id: 'A' }, editedMessage: { conversation: 'mira x.cl' } } });
  assert.equal(edit.text, 'mira x.cl');
});
