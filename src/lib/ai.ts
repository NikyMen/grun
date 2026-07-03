import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import { buildDigest } from "./metrics";

const MODEL = "claude-opus-4-8";

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  return new Anthropic();
}

const BASE_SYSTEM = `Sos un analista senior de marketing digital y datos de Consultoría Digital.
Trabajás para el cliente Grün Store (indumentaria, sucursales en Corrientes y Misiones, Argentina).
Analizás: pauta de Meta Ads, conversaciones de WhatsApp (CRM Kommo) y ventas reales por sucursal, cruzadas por teléfono.

Reglas estrictas:
- Basá TODA afirmación numérica exclusivamente en los datos provistos en el contexto. Nunca inventes cifras.
- Si los datos no alcanzan para responder algo, decilo explícitamente y sugerí qué dato falta.
- Sé concreto y accionable: montos en ARS, porcentajes y nombres reales de campañas/sucursales.
- Español rioplatense, directo, sin humo ni generalidades de manual.
- Formato: usá títulos cortos, listas y **negritas** para lo importante. Respuestas breves salvo que pidan detalle.`;

function ratedInsightsContext(): string {
  const db = getDb();
  const rated = db
    .prepare(
      "SELECT section, content, rating FROM ai_insights WHERE rating != 0 ORDER BY id DESC LIMIT 6"
    )
    .all() as { section: string; content: string; rating: number }[];
  if (rated.length === 0) return "";
  const lines = rated.map(
    (r) =>
      `[${r.rating > 0 ? "ÚTIL" : "NO ÚTIL"}] (sección ${r.section}) ${r.content.slice(0, 400)}`
  );
  return `\n\nFeedback del usuario sobre análisis anteriores (afiná tus respuestas: profundizá lo marcado ÚTIL, evitá repetir el enfoque de lo NO ÚTIL):\n${lines.join("\n")}`;
}

export async function chat(userMessage: string): Promise<string> {
  const db = getDb();
  db.prepare("INSERT INTO chat_messages (role, content) VALUES ('user', ?)").run(userMessage);

  if (!hasApiKey()) {
    const msg =
      "⚠️ El chat de IA no está configurado todavía. Cargá tu clave en la variable **ANTHROPIC_API_KEY** del archivo `.env.local` y reiniciá el servidor.";
    db.prepare("INSERT INTO chat_messages (role, content) VALUES ('assistant', ?)").run(msg);
    return msg;
  }

  const history = (
    db
      .prepare("SELECT role, content FROM chat_messages ORDER BY id DESC LIMIT 20")
      .all() as { role: "user" | "assistant"; content: string }[]
  ).reverse();

  const digest = buildDigest();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: BASE_SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Datos actuales del negocio (JSON):\n${digest}${ratedInsightsContext()}` },
      ],
      messages,
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    db.prepare("INSERT INTO chat_messages (role, content) VALUES ('assistant', ?)").run(text);
    return text;
  } catch (err) {
    const msg = aiError(err);
    db.prepare("INSERT INTO chat_messages (role, content) VALUES ('assistant', ?)").run(msg);
    return msg;
  }
}

const SECTION_FOCUS: Record<string, string> = {
  overview: "el estado general del negocio: inversión vs retorno, conversión global y qué mover primero",
  pauta: "la pauta de Meta: qué campañas/conjuntos escalar, cuáles apagar o ajustar, y a qué públicos (edad/sexo) apuntar según costo por resultado",
  conversaciones: "las conversaciones: horarios y días pico para reforzar respuesta, líneas/vendedores con mejor captura de teléfono, y cómo mejorar la tasa de respuesta",
  ventas: "las ventas: sucursales que mejor convierten, ticket promedio y origen de las compras reales",
  matching: "el cruce conversación→compra: qué % de los que escriben terminan comprando, dónde se pierde la punta del embudo y cómo mejorar la atribución (captura de teléfonos)",
};

export async function generateInsight(section: string, filters: Record<string, string>): Promise<{ id: number; content: string }> {
  const db = getDb();
  if (!hasApiKey()) {
    return {
      id: 0,
      content:
        "⚠️ Configurá **ANTHROPIC_API_KEY** en `.env.local` para habilitar las recomendaciones de IA.",
    };
  }
  const digest = buildDigest(filters);
  const focus = SECTION_FOCUS[section] || SECTION_FOCUS.overview;
  const filtersNote = Object.keys(filters).length
    ? `\nFiltros activos del usuario: ${JSON.stringify(filters)} (los datos ya vienen filtrados).`
    : "";

  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: BASE_SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Datos actuales del negocio (JSON):\n${digest}${ratedInsightsContext()}` },
      ],
      messages: [
        {
          role: "user",
          content: `Generá un análisis breve enfocado en ${focus}.${filtersNote}
Estructura: 1) un hallazgo principal con el número que lo respalda, 2) 3 a 4 recomendaciones accionables ordenadas por impacto, cada una con la cifra que la justifica, 3) si detectás un problema de datos que limite el análisis, mencionalo en una línea al final.`,
        },
      ],
    });
    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const r = db
      .prepare("INSERT INTO ai_insights (section, content) VALUES (?, ?)")
      .run(section, content);
    return { id: Number(r.lastInsertRowid), content };
  } catch (err) {
    return { id: 0, content: aiError(err) };
  }
}

export function rateInsight(id: number, rating: number) {
  getDb().prepare("UPDATE ai_insights SET rating = ? WHERE id = ?").run(rating, id);
}

function aiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError)
    return "⚠️ La clave ANTHROPIC_API_KEY no es válida. Revisala en `.env.local`.";
  if (err instanceof Anthropic.RateLimitError)
    return "⚠️ Límite de uso de la API alcanzado. Esperá un momento y volvé a intentar.";
  if (err instanceof Anthropic.APIConnectionError)
    return "⚠️ No se pudo conectar con la API de Claude. Revisá la conexión a internet del servidor.";
  if (err instanceof Anthropic.APIError)
    return `⚠️ Error de la API de Claude (${err.status}): ${err.message}`;
  return `⚠️ Error inesperado: ${err instanceof Error ? err.message : String(err)}`;
}
