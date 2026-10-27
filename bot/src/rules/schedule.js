// Regla: mensajes fuera del horario permitido.
import { isWithinSchedule } from '../time.js';
import { fill, ruleConfig } from './util.js';

export default {
  id: 'schedule',
  label: 'Fuera de horario',
  async check({ group, now }) {
    const cfg = ruleConfig(group, 'schedule');
    if (!cfg || isWithinSchedule(now.minutes, cfg.start, cfg.end)) return null;
    return {
      reason: fill(cfg.reason || 'solo se puede publicar entre las {start} y las {end} hrs', cfg),
      details: { hora: now.hhmm, horario: `${cfg.start}-${cfg.end}` },
    };
  },
};
