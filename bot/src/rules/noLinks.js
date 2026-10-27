// Regla: no se permiten enlaces.
import { findLink } from '../links.js';
import { fill, ruleConfig } from './util.js';

export default {
  id: 'no_links',
  label: 'Enlace',
  async check({ group, info }) {
    const cfg = ruleConfig(group, 'no_links');
    if (!cfg) return null;
    const link = findLink(info.text);
    if (!link) return null;
    return { reason: fill(cfg.reason || 'no se permiten enlaces en este grupo', cfg), details: { enlace: link } };
  },
};
