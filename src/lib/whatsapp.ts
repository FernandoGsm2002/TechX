/**
 * whatsapp.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers para generar links de WhatsApp (wa.me) con mensajes pre-llenados.
 * No requiere API externa. Abre WhatsApp Web / App con el mensaje listo
 * para que el técnico lo envíe con un click.
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Estados del sistema de tickets para notificaciones WhatsApp.
 * Incluye todos los estados para no tener errores en runtime.
 */
export type TicketNotifStatus =
  | "recibido"
  | "en_proceso"
  | "completado"
  | "entregado"
  | "fallido";

export interface WhatsAppMessageOptions {
  /** Numero limpio con o sin +. Ej: "51999999999" o "+51 999 999 999" */
  phone:        string;
  customerName: string;
  orgName:      string;
  ticketId:     string;
  status:       TicketNotifStatus;
  device:       string;
  orgWhatsapp?: string | null;
  warrantyDays?: number | null;
  extraNote?:   string;
}

// ── Plantillas de mensajes ────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<TicketNotifStatus, (o: WhatsAppMessageOptions) => string> = {

  recibido: (o) =>
    `Hola *${o.customerName}*, confirmamos desde *${o.orgName}* que hemos recibido ` +
    `su equipo *${o.device}* para reparacion.\n\n` +
    `Su numero de ticket es: *#${o.ticketId}*\n` +
    `Le avisaremos cuando haya novedades.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,

  en_proceso: (o) =>
    `Hola *${o.customerName}*, le escribimos de *${o.orgName}*.\n\n` +
    `Su equipo *${o.device}* (Ticket #${o.ticketId}) ya se encuentra ` +
    `*en proceso de reparacion*. Le avisaremos cuando este listo.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,

  completado: (o) =>
    `Hola *${o.customerName}*, le escribimos de *${o.orgName}*.\n\n` +
    `Su equipo *${o.device}* (Ticket #${o.ticketId}) esta *listo para ser retirado*. ✅\n\n` +
    `Puede pasar a buscarlo cuando guste.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,

  entregado: (o) => {
    const garantia = o.warrantyDays && o.warrantyDays > 0
      ? `\n\nSu reparacion tiene una *garantia de ${o.warrantyDays} dias* a partir de hoy.`
      : "";
    return (
      `Hola *${o.customerName}*, le escribimos de *${o.orgName}*.\n\n` +
      `Su equipo *${o.device}* (Ticket #${o.ticketId}) ` +
      `ya fue *entregado exitosamente*. ✅${garantia}\n\n` +
      `Gracias por confiar en nosotros.` +
      (o.extraNote ? `\n\n${o.extraNote}` : "") +
      `\n\n_${o.orgName}_`
    );
  },

  fallido: (o) =>
    `Hola *${o.customerName}*, le escribimos de *${o.orgName}*.\n\n` +
    `Lamentamos informarle que no fue posible realizar la reparacion de su ` +
    `equipo *${o.device}* (Ticket #${o.ticketId}).\n\n` +
    `Puede pasar a retirar su equipo cuando lo desee.` +
    (o.extraNote ? `\n\n*Motivo:* ${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,
};

// ── Safe status resolver ──────────────────────────────────────────────────────

/**
 * Resuelve el status de WhatsApp de manera segura.
 * Si llega un status desconocido (ej: "cancelado") usa "recibido" como fallback.
 */
function resolveNotifStatus(status: string): TicketNotifStatus {
  const known: TicketNotifStatus[] = ["recibido", "en_proceso", "completado", "entregado", "fallido"];
  return known.includes(status as TicketNotifStatus)
    ? (status as TicketNotifStatus)
    : "recibido";
}

// ── Core helpers ──────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "");
}

export function buildWhatsAppUrl(opts: WhatsAppMessageOptions): string {
  const safeOpts = { ...opts, status: resolveNotifStatus(opts.status) };
  const phone    = normalizePhone(safeOpts.phone);
  const text     = STATUS_MESSAGES[safeOpts.status](safeOpts);
  const encoded  = encodeURIComponent(text);
  return `https://wa.me/${phone}?text=${encoded}`;
}

export function buildWhatsAppMessage(opts: WhatsAppMessageOptions): string {
  const safeOpts = { ...opts, status: resolveNotifStatus(opts.status) };
  return STATUS_MESSAGES[safeOpts.status](safeOpts);
}
