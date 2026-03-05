import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(l => l && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i), l.slice(i+1)]; })
);

const TLDV_API_KEY = env.TLDV_API_KEY;
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
const MEETING_ID = "69a8813527101a0013532338";

const SYSTEM_PROMPT = `Eres el asistente de ventas de FastForward LLC, consultora en Miami que ayuda a empresas latinoamericanas a entrar al mercado estadounidense (registro FDA, LLC, trademark, FSMA, US Agent Inbox, FSVP Generator Pro).

El CEO es Carlos. Redactas correos de seguimiento post-consulta inicial en su nombre, desde info@fastfwdus.com.

Responde SOLO con JSON válido sin backticks ni texto extra:
{"subject": "asunto", "body": "cuerpo en texto plano"}

INSTRUCCIONES POR EMAIL:
Email 1: Calidez + diagnóstico personalizado basado en la reunión + CTA agendar segunda llamada
Email 2: Prueba social de cliente similar al sector del prospecto + recordatorio CTA
Email 3: Ataca la objeción principal que surgió en la reunión + CTA
Email 4: Último llamado, urgencia real, puerta abierta

REGLAS:
- Tono: directo, humano, latinoamericano. SIN "espero que este correo te encuentre bien".
- Referencia SIEMPRE detalles específicos: productos, países, problemas reales de la reunión.
- Sin placeholders genéricos — usa nombres y detalles reales de la transcripción.
- Máximo 150 palabras por correo.
- CTA siempre es agendar llamada: https://calendly.com/fastforwardllc
- Firma: Carlos | CEO - FastForward LLC | www.fastfwdus.com`;

async function main() {
  console.log("Obteniendo transcripción de tldv...");
  const res = await fetch(`https://pasta.tldv.io/v1alpha1/meetings/${MEETING_ID}/transcript`, {
    headers: { "x-api-key": TLDV_API_KEY }
  });
  const data = await res.json();
  const transcript = data.data
    .map(u => `${u.speaker}: ${u.text.replace(/\s+/g, " ").trim()}`)
    .join("\n");

  console.log(`✅ Transcripción obtenida (${transcript.length} caracteres)\n`);

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const labels = ["Inmediato", "Día 3", "Día 6", "Día 9"];

  for (let i = 1; i <= 4; i++) {
    process.stdout.write(`Generando email ${i}/4...`);
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Transcripción de la reunión con Candela Camargo / Grupo Molinos Cañuelas:\n\n${transcript}\n\nGenera el EMAIL NÚMERO ${i} de la secuencia.`
      }],
    });

    const text = response.content.map(b => b.text || "").join("");
    const email = JSON.parse(text.replace(/```json|```/g, "").trim());

    console.log(` ✅\n`);
    console.log("─".repeat(60));
    console.log(`EMAIL ${i} — ${labels[i-1]}`);
    console.log("─".repeat(60));
    console.log(`ASUNTO: ${email.subject}\n`);
    console.log(email.body);
    console.log();
  }
}

main().catch(console.error);
