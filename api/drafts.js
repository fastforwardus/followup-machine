import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from("followup_emails_sent")
    .select(`*, followup_sequences(prospect_email, prospect_name, meeting_title)`)
    .eq("status", "draft")
    .order("sent_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ drafts: data || [] });
}
