// Descripción de cada regla para el formulario de Reglas. Las claves coinciden con las que usa el bot.
export const RULE_DEFS = [
  {
    id: 'only_chile',
    title: 'Solo números chilenos (+56)',
    hint: 'Expulsa al entrar a quien tenga otro código de país. Si el número está oculto, va a "Casos".',
    fields: [],
  },
  {
    id: 'no_links',
    title: 'Sin enlaces',
    hint: 'Borra mensajes con links o dominios (los correos electrónicos sí se permiten).',
    fields: [{ key: 'reason', label: 'Motivo que se le explica a la persona', type: 'text' }],
  },
  {
    id: 'schedule',
    title: 'Horario permitido',
    hint: 'Fuera de este horario los mensajes se borran.',
    fields: [
      { key: 'start', label: 'Desde', type: 'time', half: true },
      { key: 'end', label: 'Hasta', type: 'time', half: true },
      { key: 'reason', label: 'Motivo ({start} y {end} se reemplazan por las horas)', type: 'text' },
    ],
  },
  {
    id: 'max_photos',
    title: 'Máximo de fotos por publicación',
    hint: 'Las fotos de un álbum se cuentan juntas.',
    fields: [
      { key: 'max', label: 'Máximo de fotos', type: 'number', min: 1, max: 30, half: true },
      { key: 'album_window_seconds', label: 'Segundos para agrupar fotos', type: 'number', min: 5, max: 300, half: true },
      { key: 'reason', label: 'Motivo ({max} se reemplaza)', type: 'text' },
    ],
  },
  {
    id: 'post_limit',
    title: 'Límite de publicaciones',
    hint: 'Mensajes seguidos de la misma persona cuentan como una sola publicación.',
    fields: [
      { key: 'max_posts', label: 'Máximo de publicaciones', type: 'number', min: 1, max: 100, half: true },
      { key: 'window_days', label: 'Cada cuántos días', type: 'number', min: 1, max: 60, half: true },
      { key: 'merge_window_seconds', label: 'Segundos para juntar mensajes en una publicación', type: 'number', min: 10, max: 1800, default: 120 },
      { key: 'no_consecutive_days', label: 'No permitir publicar en dos días seguidos', type: 'checkbox' },
      { key: 'count_replies', label: 'Contar también las respuestas (mensajes citando a otro)', type: 'checkbox' },
      { key: 'reason', label: 'Motivo ({max_posts} y {window_days} se reemplazan)', type: 'text' },
    ],
  },
];

/** Lee el formulario de reglas y arma el JSON que se guarda en groups.rules. */
export function rulesFromForm(formData, current = {}) {
  const rules = { ...current };
  for (const def of RULE_DEFS) {
    const r = { ...(current[def.id] ?? {}) };
    r.enabled = formData.get(`${def.id}.enabled`) === 'on';
    for (const f of def.fields) {
      const name = `${def.id}.${f.key}`;
      if (f.type === 'checkbox') r[f.key] = formData.get(name) === 'on';
      else if (f.type === 'number') {
        const n = Math.round(Number(formData.get(name)));
        if (Number.isFinite(n)) r[f.key] = Math.min(f.max ?? n, Math.max(f.min ?? n, n));
      } else if (f.type === 'time') {
        const v = String(formData.get(name) ?? '');
        if (/^\d{2}:\d{2}$/.test(v)) r[f.key] = v;
      } else {
        const v = String(formData.get(name) ?? '').trim();
        if (v) r[f.key] = v.slice(0, 300);
      }
    }
    rules[def.id] = r;
  }
  return rules;
}
