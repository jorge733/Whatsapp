// Reemplaza {campo} en un texto con los valores de la regla. Ej: "entre {start} y {end}".
export function fill(template, values) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (m, k) => (values[k] ?? m));
}

/** Configuración de una regla, solo si está activada. */
export function ruleConfig(group, id) {
  const cfg = group?.rules?.[id];
  return cfg && cfg.enabled ? cfg : null;
}
