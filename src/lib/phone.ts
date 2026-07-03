// Normaliza teléfonos argentinos a 10 dígitos (área + número, sin 0 / 54 / 9)
// para poder cruzar contactos del CRM con ventas sin duplicados ni falsos negativos.
export function normPhone(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v).replace(/\D/g, "");
  s = s.replace(/^0+/, "");
  if (s.startsWith("54")) s = s.slice(2);
  if (s.startsWith("9") && s.length > 10) s = s.slice(1);
  if (s.length > 10) s = s.slice(-10);
  return s.length >= 6 ? s : "";
}
