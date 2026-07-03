// Utilidades de formato para el cliente (sin dependencias de servidor)

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n || 0);
}

export function fmtPct(n: number, digits = 1): string {
  return `${(n || 0).toFixed(digits).replace(".", ",")}%`;
}

export const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const SEX_LABEL: Record<string, string> = {
  male: "Hombres",
  female: "Mujeres",
  unknown: "Sin datos",
};
export function sexLabel(s: string) {
  return SEX_LABEL[s] || s;
}

// Renderizado mínimo de markdown (para respuestas de la IA)
export function mdToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = md.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (h) {
      closeLists();
      out.push(`<h3>${inline(h[2])}</h3>`);
    } else if (ul) {
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${inline(ul[1])}</li>`);
    } else if (ol) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${inline(ol[1])}</li>`);
    } else if (line.trim() === "") {
      closeLists();
    } else {
      closeLists();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeLists();
  return out.join("");
}
