import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { draftId } = req.body;
  await supabase.from("followup_emails_sent").update({ status: "discarded" }).eq("id", draftId);
  return res.status(200).json({ ok: true });
}
