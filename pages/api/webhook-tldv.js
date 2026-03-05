import { getMeeting, getMeetingTranscript, extractProspect } from "../../lib/tldv.js";
import { generateFollowUpEmail } from "../../lib/anthropic.js";
import { supabase } from "../../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.WEBHOOK_SECRET) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = req.body;
    const meetingId = payload.data?.id || payload.meeting_id || payload.id;
    if (!meetingId) return res.status(400).json({ error: "No meeting_id" });

    const { data: existing } = await supabase
      .from("followup_sequences")
      .select("id")
      .eq("tldv_meeting_id", meetingId)
      .single();

    if (existing) return res.status(200).json({ ok: true, skipped: true });

    const [meeting, transcript] = await Promise.all([
      getMeeting(meetingId),
      getMeetingTranscript(meetingId),
    ]);

    const { email: prospectEmail, name: prospectName } = extractProspect(meeting);

    if (!prospectEmail) {
      await supabase.from("followup_sequences").insert({
        tldv_meeting_id: meetingId,
        meeting_title: meeting.name,
        meeting_date: meeting.happenedAt,
        raw_transcript: transcript,
        prospect_email: "MANUAL_REVIEW_REQUIRED",
        status: "needs_email",
      });
      return res.status(200).json({ ok: true, needs_manual: true });
    }

    const { data: sequence, error: dbError } = await supabase
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
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Generar email pero guardar como borrador — NO enviar
    const email = await generateFollowUpEmail(transcript, 1, prospectName || prospectEmail);

    await supabase.from("followup_emails_sent").insert({
      sequence_id: sequence.id,
      email_number: 1,
      subject: email.subject,
      body: email.body,
      status: "draft",
    });

    console.log(`Draft created for ${prospectEmail}`);
    return res.status(200).json({ ok: true, draft_created: true, prospect: prospectEmail });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
}
