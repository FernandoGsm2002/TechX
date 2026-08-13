import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const apiKey = process.env.DEEPSEEK_API_KEY || "";
const openai = apiKey ? new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: apiKey,
}) : null;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { issue, device } = await req.json();

    // Si NO hay API Key configurada, utilizamos el simulador (mock) como respaldo
    if (!openai) {
      let suggestion = "Basado en los síntomas descritos, se requiere una revisión general de la placa y componentes.";
      const lowerIssue = (issue || "").toLowerCase();
      
      if (lowerIssue.includes("no enciende")) {
        suggestion = "Posible corto en la línea principal (VCC_MAIN/VDD_MAIN) o falla en el circuito de encendido (PMIC/IF PMIC). Se recomienda realizar prueba de consumo con fuente de alimentación (verificar si hay consumo inicial o tras presionar power).";
      } else if (lowerIssue.includes("pantalla") || lowerIssue.includes("display") || lowerIssue.includes("roto")) {
        suggestion = "El síntoma principal indica daño físico en el módulo de pantalla. Se recomienda probar con una pantalla nueva antes de proceder con reparaciones en placa. Verificar también el conector FPC por si hay daños o sulfatación.";
      } else if (lowerIssue.includes("carga") || lowerIssue.includes("bateria") || lowerIssue.includes("batería")) {
        suggestion = "Problema relacionado con el sistema de carga. Pasos recomendados: 1) Probar con otro cable/cargador, 2) Revisar pin/flex de carga, 3) Medir consumo USB (descartar Tristar/Tigris o IC de carga), 4) Descartar batería degradada.";
      } else if (lowerIssue.includes("agua") || lowerIssue.includes("mojado") || lowerIssue.includes("humedad")) {
        suggestion = "Equipo mojado. ALERTA: NO encender ni conectar al cargador. Proceder inmediatamente con desarme completo y baño químico / limpieza en tina ultrasónica. Inspeccionar sulfatación bajo el microscopio, especialmente en conectores FPC y blindajes.";
      } else if (lowerIssue.includes("calienta") || lowerIssue.includes("temperatura")) {
        suggestion = "Sobrecalentamiento reportado. Esto suele indicar un corto circuito, línea en corto o fuga de corriente severa. Recomendación: Usar método Rosin (resina) o cámara térmica inyectando voltaje moderado en la línea principal para ubicar el componente responsable.";
      } else if (lowerIssue.includes("señal") || lowerIssue.includes("wifi") || lowerIssue.includes("red")) {
        suggestion = "Falla de radiofrecuencia (RF) o red. Verificar: 1) Estado de IMEI (marcación *#06# o ajustes), 2) Antenas físicas desconectadas, 3) IC de Baseband o WTR. Si es WiFi, verificar el módulo/IC de WiFi o líneas de alimentación del mismo.";
      }

      await new Promise(r => setTimeout(r, 1200));
      return NextResponse.json({ 
        suggestion, 
        warning: "⚠️ Estás usando el modo de simulación. Agrega tu DEEPSEEK_API_KEY en .env.local para obtener respuestas reales de IA." 
      });
    }

    // --- MODO REAL CON DEEPSEEK ---
    const systemPrompt = `Eres un asistente técnico experto en reparación de dispositivos electrónicos (celulares, tablets, laptops). 
Tu objetivo es ayudar al técnico a diagnosticar rápidamente el equipo según el síntoma o problema descrito por el cliente.
Instrucciones:
1. Sé directo y profesional. No saludes.
2. Identifica posibles componentes fallados.
3. Sugiere 2 o 3 pasos de diagnóstico inicial (mediciones recomendadas, descartes básicos).
4. Mantén la respuesta breve (máximo 4-5 oraciones) enfocada en soluciones a nivel de hardware y micro-soldadura si es necesario.`;

    const userPrompt = `Dispositivo: ${device || "No especificado"}\nSíntoma reportado por el cliente: ${issue}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "deepseek-chat", // Modelo recomendado para tareas de razonamiento/chat
      temperature: 0.3, // Temperatura baja para respuestas técnicas precisas
      max_tokens: 300,
    });

    const suggestion = completion.choices[0].message.content;

    return NextResponse.json({ suggestion });
  } catch (error: unknown) {
    console.error("DeepSeek API Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
