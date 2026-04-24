/**
 * whatsapp.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers para generar links de WhatsApp (wa.me) con mensajes pre-llenados.
 * No requiere API externa. Abre WhatsApp Web / App con el mensaje listo
 * para que el técnico lo envíe con un click.
 */

// ── Utilidades internas ───────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "");
}

function waUrl(phone: string, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICKETS DE REPARACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export type TicketNotifStatus =
  | "recibido"
  | "en_proceso"
  | "completado"
  | "entregado"
  | "fallido";

export type WhatsAppStyle = "formal" | "corto" | "amigable" | "corp";

export interface WhatsAppStyleMeta {
  key:         WhatsAppStyle;
  label:       string;
  emoji:       string;
  description: string;
}

export const WA_STYLES: WhatsAppStyleMeta[] = [
  { key: "formal",   label: "Formal",   emoji: "🤝", description: "Tono profesional y respetuoso" },
  { key: "corto",    label: "Corto",    emoji: "🎯", description: "Directo al punto, sin adornos"  },
  { key: "amigable", label: "Amigable", emoji: "😊", description: "Cálido, casual y con emojis"    },
  { key: "corp",     label: "Corp",     emoji: "💼", description: "Corporativo y estructurado"      },
];

export interface WhatsAppMessageOptions {
  phone:         string;
  customerName:  string;
  orgName:       string;
  ticketId:      string;
  status:        TicketNotifStatus;
  device:        string;
  orgWhatsapp?:  string | null;
  warrantyDays?: number | null;
  extraNote?:    string;
  /** Tone style — defaults to "amigable" */
  style?:        WhatsAppStyle;
}

// ── Mensajes por estilo ───────────────────────────────────────────────────────

type MsgSet = Record<TicketNotifStatus, (o: WhatsAppMessageOptions) => string>;

const MESSAGES_FORMAL: MsgSet = {
  recibido: (o) =>
    `Estimado/a *${o.customerName}*, desde *${o.orgName}* le confirmamos la recepción de su dispositivo *${o.device}* para evaluación técnica.\n\n` +
    `📋 Número de orden: *#${o.ticketId}*.\nLe notificaremos oportunamente.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_Atte. ${o.orgName}_`,

  en_proceso: (o) =>
    `Estimado/a *${o.customerName}*, le informamos que su dispositivo *${o.device}* (Orden #${o.ticketId}) se encuentra *en proceso de reparación*.\n\n` +
    `⏳ Le contactaremos cuando dispongamos de novedades.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_Atte. ${o.orgName}_`,

  completado: (o) =>
    `Estimado/a *${o.customerName}*, nos complace informarle que su dispositivo *${o.device}* (Orden #${o.ticketId}) *ha concluido el proceso de reparación* y se encuentra disponible para ser retirado.\n\n` +
    `📍 Puede acercarse en nuestro horario de atención.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_Atte. ${o.orgName}_`,

  entregado: (o) => {
    const g = o.warrantyDays && o.warrantyDays > 0
      ? `\n\n🛡️ La reparación cuenta con una *garantía de ${o.warrantyDays} días* a partir de la fecha de entrega.` : "";
    return `Estimado/a *${o.customerName}*, confirmamos la entrega de su dispositivo *${o.device}* (Orden #${o.ticketId}).${g}\n\nHa sido un placer atenderle.` +
      (o.extraNote ? `\n\n${o.extraNote}` : "") + `\n\n_Atte. ${o.orgName}_`;
  },

  fallido: (o) =>
    `Estimado/a *${o.customerName}*, lamentamos informarle que no fue posible completar la reparación de su dispositivo *${o.device}* (Orden #${o.ticketId}).\n\n` +
    `📍 Puede pasar a retirarlo en nuestro horario de atención.` +
    (o.extraNote ? `\n\n*Motivo:* ${o.extraNote}` : "") +
    `\n\n_Atte. ${o.orgName}_`,
};

const MESSAGES_CORTO: MsgSet = {
  recibido: (o) =>
    `Hola *${o.customerName}*, recibimos tu *${o.device}*. Orden *#${o.ticketId}*.` +
    (o.extraNote ? ` ${o.extraNote}` : "") +
    ` Avisamos pronto. — _${o.orgName}_`,

  en_proceso: (o) =>
    `Hola *${o.customerName}*, tu *${o.device}* (#${o.ticketId}) está en reparación. Pronto novedades. — _${o.orgName}_`,

  completado: (o) =>
    `Hola *${o.customerName}*, tu *${o.device}* está listo. ✅ Puedes pasar a retirarlo.` +
    (o.extraNote ? ` ${o.extraNote}` : "") +
    ` — _${o.orgName}_`,

  entregado: (o) => {
    const g = o.warrantyDays && o.warrantyDays > 0 ? ` Garantía: ${o.warrantyDays} días.` : "";
    return `*${o.customerName}*, *${o.device}* entregado.${g} Gracias. 👋 — _${o.orgName}_`;
  },

  fallido: (o) =>
    `Hola *${o.customerName}*, no fue posible reparar tu *${o.device}* (#${o.ticketId}). Puedes pasar a retirarlo.` +
    (o.extraNote ? ` ${o.extraNote}` : "") +
    ` — _${o.orgName}_`,
};

const MESSAGES_AMIGABLE: MsgSet = {
  recibido: (o) =>
    `🙌 Hola *${o.customerName}*! Ya tenemos tu *${o.device}* con nosotros en *${o.orgName}*.\n\n` +
    `🔖 Tu orden es la *#${o.ticketId}*. ¡Te avisamos en cuanto esté listo! 🔧` +
    (o.extraNote ? `\n\n${o.extraNote}` : ""),

  en_proceso: (o) =>
    `🔧 Hola *${o.customerName}*! Te escribimos desde *${o.orgName}*.\n\n` +
    `Tu *${o.device}* (Orden #${o.ticketId}) ya está en manos de nuestro equipo. ⏳ ¡Pronto tenemos novedades!` +
    (o.extraNote ? `\n\n${o.extraNote}` : ""),

  completado: (o) =>
    `🎉 ¡Buenas noticias *${o.customerName}*! Tu *${o.device}* ya está listo para llevar. ✅\n\n` +
    `Orden *#${o.ticketId}* completada con éxito. ¡Te esperamos en *${o.orgName}*!` +
    (o.extraNote ? `\n\n${o.extraNote}` : ""),

  entregado: (o) => {
    const g = o.warrantyDays && o.warrantyDays > 0
      ? `\n\n🛡️ Y recuerda que tienes *${o.warrantyDays} días de garantía*!` : "";
    return `💙 *${o.customerName}*, fue un gusto atenderte en *${o.orgName}*! Tu *${o.device}* ya está en tus manos.${g}\n\n¡Hasta la próxima! 👋` +
      (o.extraNote ? `\n\n${o.extraNote}` : "");
  },

  fallido: (o) =>
    `😔 Hola *${o.customerName}*, lamentamos que no pudimos reparar tu *${o.device}* (Orden #${o.ticketId}) en *${o.orgName}*.\n\n` +
    `📍 Puedes pasar a retirarlo cuando quieras. Cualquier consulta, aquí estamos.` +
    (o.extraNote ? `\n\n*Detalle:* ${o.extraNote}` : ""),
};

const MESSAGES_CORP: MsgSet = {
  recibido: (o) =>
    `*${o.customerName}*, confirmamos el ingreso de su dispositivo *${o.device}* a nuestro servicio técnico.\n\n` +
    `🔖 Referencia: *#${o.ticketId}* | ${o.orgName}\nLe notificaremos con las novedades.` +
    (o.extraNote ? `\n\n${o.extraNote}` : ""),

  en_proceso: (o) =>
    `*${o.customerName}*, su unidad *${o.device}* (Ref. #${o.ticketId}) se encuentra en proceso de diagnóstico y reparación en *${o.orgName}*.\n\nLe informaremos al concluir.` +
    (o.extraNote ? `\n\n${o.extraNote}` : ""),

  completado: (o) =>
    `*${o.customerName}*, su unidad *${o.device}* (Ref. #${o.ticketId}) ha concluido el proceso y está disponible para retiro inmediato.\n\n📍 *${o.orgName}* — Servicio Técnico.` +
    (o.extraNote ? `\n\n${o.extraNote}` : ""),

  entregado: (o) => {
    const g = o.warrantyDays && o.warrantyDays > 0
      ? `\n\n🛡️ Garantía vigente: *${o.warrantyDays} días* desde la fecha de entrega.` : "";
    return `*${o.customerName}*, confirmamos la entrega exitosa de *${o.device}* (Ref. #${o.ticketId}).${g}\n\nGracias por elegir *${o.orgName}*.` +
      (o.extraNote ? `\n\n${o.extraNote}` : "");
  },

  fallido: (o) =>
    `*${o.customerName}*, lamentamos informarle que no fue posible completar la reparación de *${o.device}* (Ref. #${o.ticketId}).\n\n` +
    `Por favor coordine el retiro de su equipo con *${o.orgName}*.` +
    (o.extraNote ? `\n\n*Observación:* ${o.extraNote}` : ""),
};

const STYLE_MAP: Record<WhatsAppStyle, MsgSet> = {
  formal:   MESSAGES_FORMAL,
  corto:    MESSAGES_CORTO,
  amigable: MESSAGES_AMIGABLE,
  corp:     MESSAGES_CORP,
};

function resolveTicketStatus(status: string): TicketNotifStatus {
  const known: TicketNotifStatus[] = ["recibido", "en_proceso", "completado", "entregado", "fallido"];
  return known.includes(status as TicketNotifStatus) ? (status as TicketNotifStatus) : "recibido";
}

export function buildWhatsAppUrl(opts: WhatsAppMessageOptions): string {
  const safeOpts = { ...opts, status: resolveTicketStatus(opts.status) };
  const msgSet = STYLE_MAP[safeOpts.style ?? "amigable"];
  return waUrl(safeOpts.phone, msgSet[safeOpts.status](safeOpts));
}

export function buildWhatsAppMessage(opts: WhatsAppMessageOptions): string {
  const safeOpts = { ...opts, status: resolveTicketStatus(opts.status) };
  const msgSet = STYLE_MAP[safeOpts.style ?? "amigable"];
  return msgSet[safeOpts.status](safeOpts);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTROS SERVICIOS
// ═══════════════════════════════════════════════════════════════════════════════

export type OtrosServiciosStatus =
  | "recibido"
  | "en_proceso"
  | "completado"
  | "entregado"
  | "fallido";

export interface OtrosServiciosMessageOptions {
  phone:        string;
  customerName: string;
  orgName:      string;
  servicioId:   string;
  /** Descripcion corta del servicio, ej: "Instalacion de sistema / Formateo" */
  servicio:     string;
  extraNote?:   string;
}

const SERVICIO_MESSAGES: Record<OtrosServiciosStatus, (o: OtrosServiciosMessageOptions) => string> = {

  recibido: (o) =>
    `📋 Hola *${o.customerName}*, desde *${o.orgName}* le confirmamos que hemos recibido ` +
    `su solicitud de servicio: *${o.servicio}*.\n\n` +
    `🔖 Referencia: *#${o.servicioId}*.\n` +
    `Le notificaremos cuando haya novedades.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,

  en_proceso: (o) =>
    `⚙️ Hola *${o.customerName}*, le escribimos desde *${o.orgName}*.\n\n` +
    `Su servicio *${o.servicio}* (Ref. #${o.servicioId}) esta siendo atendido por nuestro equipo.\n\n` +
    `⏳ Le avisaremos cuando este listo.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,

  completado: (o) =>
    `✅ Hola *${o.customerName}*, le escribimos desde *${o.orgName}*.\n\n` +
    `Su servicio *${o.servicio}* (Ref. #${o.servicioId}) ha sido completado. 🎉\n\n` +
    `📍 Esta listo para ser retirado o podemos coordinar la entrega. Comuniquese con nosotros.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,

  entregado: (o) =>
    `🤝 Hola *${o.customerName}*, le escribimos desde *${o.orgName}*.\n\n` +
    `Su servicio *${o.servicio}* (Ref. #${o.servicioId}) ha sido completado y entregado exitosamente.\n\n` +
    `💙 Gracias por elegirnos. Cualquier consulta no dude en contactarnos.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,

  fallido: (o) =>
    `😔 Hola *${o.customerName}*, le escribimos desde *${o.orgName}*.\n\n` +
    `Lamentamos informarle que no pudimos completar el servicio *${o.servicio}* (Ref. #${o.servicioId}).\n\n` +
    `Por favor comuniquese con nosotros para mas informacion.` +
    (o.extraNote ? `\n\n*Detalle:* ${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`,
};

function resolveServicioStatus(status: string): OtrosServiciosStatus {
  const known: OtrosServiciosStatus[] = ["recibido", "en_proceso", "completado", "entregado", "fallido"];
  return known.includes(status as OtrosServiciosStatus) ? (status as OtrosServiciosStatus) : "recibido";
}

export function buildServicioWhatsAppUrl(opts: OtrosServiciosMessageOptions & { status: string }): string {
  const safeStatus = resolveServicioStatus(opts.status);
  return waUrl(opts.phone, SERVICIO_MESSAGES[safeStatus](opts));
}

export function buildServicioWhatsAppMessage(opts: OtrosServiciosMessageOptions & { status: string }): string {
  return SERVICIO_MESSAGES[resolveServicioStatus(opts.status)](opts);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COBRO DE DEUDAS (FIADOS)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeudaWhatsAppOptions {
  phone:          string;
  customerName:   string;
  orgName:        string;
  totalDebt:      number;
  currencySymbol: string;
  /** Lista corta de items pendientes, ej: ["Reparación Samsung S21 — S/ 150", "Venta POS — S/ 80"] */
  items?:         string[];
  extraNote?:     string;
}

export function buildDeudaWhatsAppMessage(o: DeudaWhatsAppOptions): string {
  const total = `${o.currencySymbol} ${o.totalDebt.toFixed(2)}`;

  const detalle =
    o.items && o.items.length > 0
      ? `\n\n📄 *Detalle pendiente:*\n${o.items.map((i) => `• ${i}`).join("\n")}`
      : "";

  return (
    `💰 Hola *${o.customerName}*, le contactamos desde *${o.orgName}*.\n\n` +
    `Le recordamos que tiene un saldo pendiente de *${total}* con nosotros.${detalle}\n\n` +
    `🙏 Le agradecemos gestionar el pago a la brevedad. ` +
    `Si ya realizo el pago o tiene alguna consulta, no dude en comunicarse con nosotros.` +
    (o.extraNote ? `\n\n${o.extraNote}` : "") +
    `\n\n_${o.orgName}_`
  );
}

export function buildDeudaWhatsAppUrl(opts: DeudaWhatsAppOptions): string {
  return waUrl(opts.phone, buildDeudaWhatsAppMessage(opts));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPROBANTE DE PAGO
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReceiptWhatsAppOptions {
  phone:          string;
  customerName:   string;
  orgName:        string;
  referenceId:    string;
  serviceDesc:    string;
  total:          number;
  currencySymbol: string;
  paymentMethod:  string;
  warrantyDays?:  number | null;
  items?:         string[];
  orgWhatsapp?:   string | null;
  orgPhone?:      string | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo:      "Efectivo 💵",
  transferencia: "Transferencia bancaria 🏦",
  tarjeta:       "Tarjeta / POS 💳",
};

export function buildReceiptWhatsAppMessage(o: ReceiptWhatsAppOptions): string {
  const total  = `${o.currencySymbol} ${o.total.toFixed(2)}`;
  const method = PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod;

  const detalle =
    o.items && o.items.length > 0
      ? `\n\n📄 *Detalle:*\n${o.items.map((i) => `  • ${i}`).join("\n")}`
      : "";

  const garantia =
    o.warrantyDays && o.warrantyDays > 0
      ? `\n\n🛡️ *Garantía:* ${o.warrantyDays} días a partir de hoy.`
      : "";

  const contacto =
    o.orgWhatsapp || o.orgPhone
      ? `\n\n📞 Ante cualquier consulta comuníquese con nosotros: ${o.orgWhatsapp ?? o.orgPhone}.`
      : "";

  return (
    `🧾 *Comprobante de pago — ${o.orgName}*\n\n` +
    `Hola *${o.customerName}*, confirmamos que hemos recibido su pago.\n\n` +
    `📋 *Orden:* #${o.referenceId}\n` +
    `🔧 *Servicio:* ${o.serviceDesc}` +
    detalle +
    `\n\n━━━━━━━━━━━━━━━\n` +
    `💰 *Total pagado:* ${total}\n` +
    `💳 *Método:* ${method}` +
    garantia +
    contacto +
    `\n\n¡Gracias por confiar en *${o.orgName}*! 🙏\n_${o.orgName}_`
  );
}

export function buildReceiptWhatsAppUrl(opts: ReceiptWhatsAppOptions): string {
  return waUrl(opts.phone, buildReceiptWhatsAppMessage(opts));
}
