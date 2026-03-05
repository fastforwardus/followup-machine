import { generateFollowUpEmail } from "../../lib/anthropic.js";
import { checkThreadForReply } from "../../lib/gmail.js";
import { supabase } from "../../lib/supabase.js";

const MAX_EMAILS = 4;
const DAYS_BETWEEN_EMAILS = 3;

export default async function handler(req, res) {
  if (req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const results = { checked: 0, drafts_created: 0, replied: 0, errors: [] };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_BETWEEN_EMAILS);

  const { data: sequences, error } = await supabase
    .from("followup_sequences")
    .select(`*, followup_emails_sent(id, email_number, gmail_thread_id, gmail_message_id, subject, status)`)
    .eq("status", "active")
    .lt("last_email_sent_at", cutoffDate.toISOString())
    .lt("current_email_number", MAX_EMAILS);

  if (error) return res.status(500).json({ error: error.message });

  results.checked = sequences.length;

  for (const seq of sequences) {
    try {
      const sentEmails = seq.followup_emails_sent || [];

      // Solo revisar replies en emails ya enviados
      const sent = sentEmails.filter(e => e.status === "sent");
      let hasReplied = false;

      for (const s of sent) {
        if (s.gmail_thread_id && await checkThreadForReply(s.gmail_thread_id)) {
          hasReplied = true;
          await supabase.from("followup_emails_sent")
            .update({ reply_detected: true, reply_detected_at: new Date().toISOString() })
            .eq("id", s.id);
          break;
        }
      }

      if (hasReplied) {
        await supabase.from("followup_sequences")
          .update({ status: "replied", replied_at: new Date().toISOString() })
          .eq("id", seq.id);
        results.replied++;
        continue;
      }

      // Verificar que no haya ya un borrador pendiente
      const hasPendingDraft = sentEmails.some(e => e.status === "draft");
      if (hasPendingDraft) continue;

      const nextEmailNumber = seq.current_email_number + 1;
      if (nextEmailNumber > MAX_EMAILS) {
        await supabase.from("followup_sequences").update({ status: "completed" }).eq("id", seq.id);
        continue;
      }

      // Generar y guardar como borrador
      const email = await generateFollowUpEmail(seq.raw_transcript, nextEmailNumber, seq.prospect_name || seq.prospect_email);

      await supabase.from("followup_emails_sent").insert({
        sequence_id: seq.id,
        email_number: nextEmailNumber,
        subject: email.subject,
        body: email.body,
        status: "draft",
      });

      results.drafts_created++;
    } catch (e) {
      results.errors.push({ sequence_id: seq.id, error: e.message });
    }
  }

  return res.status(200).json({ ok: true, ...results });
}
