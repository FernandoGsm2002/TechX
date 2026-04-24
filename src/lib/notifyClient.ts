/**
 * notifyClient — Abre WhatsApp con un mensaje pre-completado para el cliente.
 * No requiere API externa: usa el deep-link wa.me universal.
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

function cleanPhone(phone: string): string {
  // Elimina todo excepto dígitos y el + inicial
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

// ── Templates ─────────────────────────────────────────────────────────────────

export type WaTemplate =
  | "recibido"
  | "en_proceso"
  | "completado"
  | "entregado"
  | "custom";

interface NotifyClientOptions {
  phone:         string;
  clientName?:   string;
  ticketNumber?: string | number;
  device?:       string;
  orgName?:      string;
  template?:     WaTemplate;
  customMessage?: string;
}

const TEMPLATES: Record<Exclude<WaTemplate, "custom">, (o: NotifyClientOptions) => string> = {
  recibido: (o) =>
    `¡Hola${o.clientName ? " " + o.clientName : ""}! 👋\n` +
    `Te confirmamos que recibimos tu equipo${o.device ? " *" + o.device + "*" : ""}.\n` +
    (o.ticketNumber ? `📋 Ticket #${o.ticketNumber}\n` : "") +
    `Pronto te avisaremos con el diagnóstico.\n\n` +
    (o.orgName ? `_${o.orgName}_` : ""),

  en_proceso: (o) =>
    `¡Hola${o.clientName ? " " + o.clientName : ""}! 🔧\n` +
    `Tu equipo${o.device ? " *" + o.device + "*" : ""} está siendo reparado.\n` +
    (o.ticketNumber ? `📋 Ticket #${o.ticketNumber}\n` : "") +
    `Te avisaremos cuando esté listo.\n\n` +
    (o.orgName ? `_${o.orgName}_` : ""),

  completado: (o) =>
    `¡Hola${o.clientName ? " " + o.clientName : ""}! ✅\n` +
    `Tu equipo${o.device ? " *" + o.device + "*" : ""} ya está *listo para retirarlo*.\n` +
    (o.ticketNumber ? `📋 Ticket #${o.ticketNumber}\n` : "") +
    `Puedes pasar a recogerlo cuando lo desees.\n\n` +
    (o.orgName ? `_${o.orgName}_` : ""),

  entregado: (o) =>
    `¡Hola${o.clientName ? " " + o.clientName : ""}! 🎉\n` +
    `Tu equipo${o.device ? " *" + o.device + "*" : ""} fue entregado correctamente.\n` +
    (o.ticketNumber ? `📋 Ticket #${o.ticketNumber}\n` : "") +
    `Gracias por tu confianza. ¡Cualquier consulta estamos a tu disposición!\n\n` +
    (o.orgName ? `_${o.orgName}_` : ""),
};

// ── Main function ──────────────────────────────────────────────────────────────

/**
 * Abre WhatsApp con el mensaje listo para enviar al cliente.
 * Retorna false si el teléfono no es válido.
 */
export function notifyClientWhatsApp(opts: NotifyClientOptions): boolean {
  const rawPhone = opts.phone?.trim();
  if (!rawPhone) return false;

  const phone = cleanPhone(rawPhone);
  if (phone.length < 7) return false;

  let message: string;
  if (opts.template === "custom" && opts.customMessage) {
    message = opts.customMessage;
  } else {
    const tpl = TEMPLATES[((opts.template as Exclude<WaTemplate, "custom">) ?? "recibido")];
    message = tpl(opts);
  }

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/**
 * Genera solo la URL de WhatsApp (sin abrir ventana), útil para renderizar botones.
 */
export function buildWhatsAppUrl(opts: NotifyClientOptions): string | null {
  const rawPhone = opts.phone?.trim();
  if (!rawPhone) return null;
  const phone = cleanPhone(rawPhone);
  if (phone.length < 7) return null;

  const tpl = opts.template === "custom" && opts.customMessage
    ? opts.customMessage
    : TEMPLATES[((opts.template as Exclude<WaTemplate, "custom">) ?? "recibido")](opts);

  return `https://wa.me/${phone}?text=${encodeURIComponent(tpl)}`;
}
