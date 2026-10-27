// Copia en memoria de la configuración (ajustes, grupos, lista negra).
// Se actualiza al instante con Supabase Realtime y, por si acaso, cada 30 segundos.
import { EventEmitter } from 'node:events';
import { supabase, fetchSettings, fetchGroups, fetchBlacklist } from './db.js';
import { log } from './logger.js';

const POLL_MS = 30_000;

class State extends EventEmitter {
  settings = null;
  groupsByJid = new Map();
  blacklist = new Map(); // phone → { reason, source }

  async reload(what = ['settings', 'groups', 'blacklist']) {
    if (what.includes('settings')) {
      const s = await fetchSettings();
      if (s) {
        const prevTest = this.settings?.test_mode;
        this.settings = s;
        if (prevTest !== undefined && prevTest !== s.test_mode) this.emit('testModeChanged', s.test_mode);
      }
    }
    if (what.includes('groups')) {
      const rows = await fetchGroups();
      if (rows) this.groupsByJid = new Map(rows.map((g) => [g.wa_jid, g]));
    }
    if (what.includes('blacklist')) {
      const rows = await fetchBlacklist();
      if (rows) {
        const added = rows.filter((r) => !this.blacklist.has(r.phone)).map((r) => r.phone);
        const first = this.blacklist.size === 0 && !this.loadedBlacklist;
        this.blacklist = new Map(rows.map((r) => [r.phone, r]));
        this.loadedBlacklist = true;
        if (added.length && !first) this.emit('blacklistAdded', added);
      }
    }
  }

  async start() {
    await this.reload();
    if (!this.settings) throw new Error('No se pudo leer la tabla "settings". ¿Ejecutaste supabase/schema.sql?');

    const channel = supabase.channel('bot-config');
    const watch = (table, what) =>
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (table === 'review_cases') this.emit('reviewCasesChanged', payload);
        else this.reload([what]).catch((e) => log.error('Recargando configuración:', e.message));
      });
    watch('settings', 'settings');
    watch('groups', 'groups');
    watch('rule_presets', 'groups');
    watch('blacklist', 'blacklist');
    watch('review_cases', null);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') log.ok('Recibiendo cambios del panel en tiempo real.');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
        log.warn('Tiempo real no disponible; se revisarán los cambios cada 30 segundos.');
    });

    setInterval(() => {
      this.reload().catch((e) => log.error('Recargando configuración:', e.message));
      this.emit('poll');
    }, POLL_MS).unref();
  }

  get testMode() {
    return this.settings?.test_mode !== false;
  }

  group(jid) {
    return this.groupsByJid.get(jid) ?? null;
  }

  /** Grupo moderado: activado y con reglas. */
  moderatedGroup(jid) {
    const g = this.group(jid);
    return g && g.enabled && g.present && g.rules && Object.keys(g.rules).length ? g : null;
  }
}

export const state = new State();
