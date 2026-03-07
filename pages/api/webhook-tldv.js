import { getMeeting, getMeetingTranscript, extractProspect } from "../../lib/tldv.js";
import { generateFollowUpEmail } from "../../lib/anthropic.js";
import { supabase } from "../../lib/supabase.js";

// Espera hasta que la transcripcion este lista (max 10 intentos, 15s entre cada uno)
async function getMeetingTranscriptWithRetry(meetingId, maxAttempts = 10, delayMs = 15000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const transcript = await getMeetingTranscript(meetingId);
      if (transcript && transcript.trim().length > 50) {
        console.log(`[tldv] Transcript listo en intento ${attempt}`);
        return transcript;
      }
      console.log(`[tldv] Transcript vacio en intento ${attempt}/${maxAttempts}, esperando...`);
    } catch (e) {
      console.log(`[tldv] Error transcript intento ${attempt}/${maxAttempts}: ${e.message}`);
    }
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Transcript no disponible despues de ${maxAttempts} intentos`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Log completo del payload para debugging
  console.log("[tldv-webhook] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[tldv-webhook] Body:", JSON.stringify(req.body, null, 2));

  const secret = req.headers["x-webhook-secret"];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    console.log("[tldv-webhook] Auth fallida. Header recibido:", secret);
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = req.body;

    // Intentar extraer meetingId de todas las ubicaciones posibles que usa tldv
    const meetingId =
      payload?.data?.id ||
      payload?.data?.meeting?.id ||
      payload?.meeting?.id ||
      payload?.meeting_id ||
      payload?.id ||
      payload?.data?.meetingId ||
      payload?.meetingId;

    console.log("[tldv-webhook] meetingId extraido:", meetingId);
    console.log("[tldv-webhook] event type:", payload?.event || payload?.type || payload?.data?.type);

    if (!meetingId) {
      console.log("[tldv-webhook] ERROR: No se pudo extraer meetingId del payload");
      return res.status(400).json({ error: "No meeting_id", payload_received: payload });
    }

    // Verificar duplicado
    const { data: existing } = await supabase
      .from("followup_sequences")
      .select("id")
      .eq("tldv_meeting_id", meetingId)
      .single();

    if (existing) {
      console.log("[tldv-webhook] Reunion ya procesada, skipping:", meetingId);
      return res.status(200).json({ ok: true, skipped: true });
    }

    // Obtener datos de la reunion
    console.log("[tldv-webhook] Obteniendo datos de reunion...");
    const meeting = await getMeeting(meetingId);
    console.log("[tldv-webhook] Meeting:", meeting.name, "| Invitees:", JSON.stringify(meeting.invitees));

    // Obtener transcript con reintentos
    console.log("[tldv-webhook] Obteniendo transcript...");
    const transcript = await getMeetingTranscriptWithRetry(meetingId);
    console.log("[tldv-webhook] Transcript obtenido, longitud:", transcript.length);

    const { email: prospectEmail, name: prospectName } = extractProspect(meeting);
    console.log("[tldv-webhook] Prospecto:", prospectEmail, prospectName);

    if (!prospectEmail) {
      const { error: insertErr } = await supabase.from("followup_sequences").insert({
        tldv_meeting_id: meetingId,
        meeting_title: meeting.name,
        meeting_date: meeting.happenedAt,
        raw_transcript: transcript,
        prospect_email: "MANUAL_REVIEW_REQUIRED",
        status: "needs_email",
        current_email_number: 0,
        last_email_sent_at: new Date().toISOString(),
      });
      if (insertErr) console.log("[tldv-webhook] Error guardando needs_email:", insertErr);
      return res.status(200).json({ ok: true, needs_manual: true });
    }

    // Insertar secuencia
    const { data: sequence, error: seqError } = await supabase
      .from("followup_sequences")
      .insert({
        tldv_meeting_id: meetingId,
        meeting_title: meeting.name,
        meeting_date: meeting.happenedAt,
        raw_transcript: transcript,
        prospect_email: prospectEmail,
        prospect_name: prospectName,
        status: "active",
        current_email_number: 0,
        last_email_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (seqError) {
      console.log("[tldv-webhook] Error insertando sequence:", seqError);
      throw seqError;
    }
    console.log("[tldv-webhook] Sequence creada:", sequence.id);

    // Generar email #1
    console.log("[tldv-webhook] Generando email #1...");
    const email = await generateFollowUpEmail(transcript, 1, prospectName || prospectEmail);
    console.log("[tldv-webhook] Email generado:", email.subject);

    // Insertar borrador
    const { error: draftError } = await supabase.from("followup_emails_sent").insert({
      sequence_id: sequence.id,
      email_number: 1,
      subject: email.subject,
      body: email.body,
      status: "draft",
      sent_at: new Date().toISOString(),
    });

    if (draftError) {
      console.log("[tldv-webhook] ERROR insertando draft:", draftError);
      throw new Error("Draft insert failed: " + draftError.message);
    }

    console.log("[tldv-webhook] Draft creado para:", prospectEmail);
    return res.status(200).json({ ok: true, draft_created: true, prospect: prospectEmail });

  } catch (error) {
    console.error("[tldv-webhook] ERROR:", error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
}
