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

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    if (!openai) {
      // Simulador básico si no hay API key
      await new Promise(r => setTimeout(r, 1000));
      return NextResponse.json({
        device: "Smartphone",
        brand: "Desconocida",
        model: "No especificado",
        issue: "Problema detectado: " + prompt.substring(0, 50) + "...",
        estimatedCost: 0,
        warning: "Modo simulador activo. Configura DEEPSEEK_API_KEY para autocompletado real."
      });
    }

    const systemPrompt = `Eres un asistente de recepción de servicio técnico. 
Tu trabajo es leer lo que dice el cliente (o las notas del recepcionista) y extraer la información en formato JSON estricto.
El JSON debe tener exactamente esta estructura:
{
  "device": "Celular" | "Tablet" | "Laptop" | "PC" | "Consola" | "Smartwatch" | "Otro",
  "brand": "Nombre de la marca (ej. Apple, Samsung, Lenovo)",
  "model": "Modelo del equipo (ej. iPhone 13 Pro, Galaxy S21)",
  "issue": "Descripción clara y estructurada del problema reportado",
  "diagnosis": "Trabajo a realizar o diagnóstico si es que se especifica en la nota, de lo contrario vacío",
  "estimatedCost": "Número entero aproximado del costo en moneda local, 0 si no se puede determinar"
}
Solo responde con el objeto JSON, sin ningún formato markdown extra, ni texto adicional.`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.1, // Temperatura muy baja porque queremos un JSON determinista
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    let data;
    try {
      data = JSON.parse(content || "{}");
    } catch (e) {
      console.error("Error parsing AI JSON", e);
      return NextResponse.json({ error: "Respuesta de IA malformada" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("DeepSeek Autocomplete Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
