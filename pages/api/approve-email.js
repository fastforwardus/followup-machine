import { sendEmail } from "../../lib/gmail.js";
import { supabase } from "../../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { draftId, subject, body, to } = req.body;
  if (!draftId) return res.status(400).json({ error: "No draftId" });

  const { data: draft, error } = await supabase
    .from("followup_emails_sent")
    .select(`*, followup_sequences(prospect_email, prospect_name, current_email_number)`)
    .eq("id", draftId)
    .eq("status", "draft")
    .single();

  if (error || !draft) return res.status(404).json({ error: "Draft not found" });

  const { data: lastSent } = await supabase
    .from("followup_emails_sent")
    .select("gmail_thread_id, gmail_message_id, subject")
    .eq("sequence_id", draft.sequence_id)
    .eq("status", "sent")
    .order("email_number", { ascending: false })
    .limit(1)
    .single();

  const finalTo = to || draft.followup_sequences.prospect_email;
  const finalSubject = subject || draft.subject;
  const finalBody = body || draft.body;

  const { threadId, messageId } = await sendEmail({
    to: finalTo,
    subject: lastSent ? "Re: " + lastSent.subject : finalSubject,
    body: finalBody,
    threadId: lastSent?.gmail_thread_id,
    inReplyTo: lastSent?.gmail_message_id,
    references: lastSent?.gmail_message_id,
  });

  await supabase.from("followup_emails_sent").update({
    status: "sent",
    subject: finalSubject,
    body: finalBody,
    gmail_thread_id: threadId || lastSent?.gmail_thread_id,
    gmail_message_id: messageId,
  }).eq("id", draftId);

  await supabase.from("followup_sequences").update({
    current_email_number: draft.email_number,
    last_email_sent_at: new Date().toISOString(),
  }).eq("id", draft.sequence_id);

  return res.status(200).json({ ok: true, sent_to: finalTo });
}
