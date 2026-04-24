import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY || "";
const openai = apiKey ? new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: apiKey,
}) : null;

export async function POST(req: Request) {
  try {
    const { text, field } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (!openai) {
      // Si no hay API key, simplemente regresamos el mismo texto
      return NextResponse.json({ text });
    }

    let systemPrompt = "";

    if (field === "issue") {
      systemPrompt = `Eres un asistente que corrige descripciones de problemas técnicos de dispositivos.
El usuario escribirá un texto posiblemente desordenado o mal escrito.
Tu objetivo es devolver una descripción clara, corta y profesional (máximo 15 palabras) del problema, adecuada para imprimir en un comprobante o boleta técnica.
NO agregues comillas, saludos ni texto adicional. Solo devuelve la descripción corregida.`;
    } else if (field === "diagnosis") {
      systemPrompt = `Eres un asistente que resume trabajos técnicos realizados en dispositivos.
El usuario escribirá un texto posiblemente desordenado detallando lo que reparó o diagnosticó.
Tu objetivo es devolver una descripción clara, corta y profesional (máximo 15 palabras) del trabajo realizado, adecuada para imprimir en un comprobante o boleta técnica.
NO agregues comillas, saludos ni texto adicional. Solo devuelve el resumen corregido.`;
    } else {
      return NextResponse.json({ error: "Invalid field type" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      model: "deepseek-chat",
      temperature: 0.3, 
    });

    const fixedText = completion.choices[0].message.content?.trim() || text;

    return NextResponse.json({ text: fixedText });
  } catch (error: any) {
    console.error("DeepSeek Fix Text Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
