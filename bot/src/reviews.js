// "Casos para revisar": ejecuta lo que elijas en el panel (expulsar / ignorar)
// y vuelve a intentar averiguar los números ocultos cada cierto tiempo.
import { state } from './state.js';
import { fetchReviewCases, updateReviewCase, logAction } from './db.js';
import { resolvePerson } from './identity.js';
import { cachedMetadata, refreshGroup, findParticipant, participantIds } from './groups.js';
import { kickPerson } from './sanctions.js';
import { isChilean, formatPhone } from './phone.js';
import { log } from './logger.js';

let running = false;
let lastPendingCheck = 0;

function groupById(id) {
  for (const g of state.groupsByJid.values()) if (g.id === id) return g;
  return null;
}

async function close(c, status, result) {
  await updateReviewCase(c.id, { status, result, resolved_at: new Date().toISOString() });
}

export async function processReviewCases() {
  if (running) return;
  running = true;
  try {
    // 1) Decisiones tomadas en el panel.
    for (const c of (await fetchReviewCases(['kick_requested'])) ?? []) {
      const group = groupById(c.group_id);
      if (!group) {
        await close(c, 'failed', 'El grupo ya no existe.');
        continue;
      }
      const ids = [c.participant_jid, ...(c.details?.ids ?? [])];
      const who = await resolvePerson(ids);
      const ok = await kickPerson({ group, who, participantJid: c.participant_jid, rule: 'manual', reason: 'decisión manual en el panel' });
      const result = state.testMode ? 'Modo prueba: se registró, pero no se expulsó.' : ok ? 'Expulsado.' : 'No se pudo expulsar (¿el bot es admin?).';
      await close(c, ok ? 'done' : 'failed', result);
    }

    // 2) Casos pendientes de número oculto: reintentar cada 5 minutos.
    if (Date.now() - lastPendingCheck < 5 * 60_000) return;
    lastPendingCheck = Date.now();
    for (const c of (await fetchReviewCases(['pending'])) ?? []) {
      const group = groupById(c.group_id);
      if (!group) continue;
      const meta = cachedMetadata(group.wa_jid) ?? (await refreshGroup(group.wa_jid));
      const p = findParticipant(group.wa_jid, [c.participant_jid]);
      if (meta && !p) {
        await close(c, 'done', 'La persona ya no está en el grupo.');
        continue;
      }
      const who = await resolvePerson([c.participant_jid, ...(p ? participantIds(p) : [])]);
      if (!who.phone) continue;
      await updateReviewCase(c.id, { phone: who.phone });
      if (isChilean(who.phone)) {
        await close(c, 'done', `Se identificó el número ${formatPhone(who.phone)}: es chileno, no se expulsó.`);
      } else if (group.rules?.only_chile?.enabled) {
        const ok = await kickPerson({ group, who, participantJid: c.participant_jid, rule: 'only_chile', reason: 'el número no es chileno (+56)' });
        await close(c, ok ? 'done' : 'failed', `Se identificó el número ${formatPhone(who.phone)}: no es chileno.`);
      }
      await logAction({
        group_id: group.id, group_name: group.wa_name, phone: who.phone, participant_jid: c.participant_jid,
        rule: 'only_chile', action: 'info', test_mode: state.testMode, details: { caso: c.id, numero_identificado: true },
      });
    }
  } catch (e) {
    log.error('Casos para revisar:', e?.message ?? e);
  } finally {
    running = false;
  }
}
