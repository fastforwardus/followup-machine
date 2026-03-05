const TLDV_API_BASE = "https://pasta.tldv.io/v1alpha1";

export async function getMeeting(meetingId) {
  const res = await fetch(`${TLDV_API_BASE}/meetings/${meetingId}`, {
    headers: { "x-api-key": process.env.TLDV_API_KEY },
  });
  if (!res.ok) throw new Error(`tldv meeting error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getMeetingTranscript(meetingId) {
  const res = await fetch(`${TLDV_API_BASE}/meetings/${meetingId}/transcript`, {
    headers: { "x-api-key": process.env.TLDV_API_KEY },
  });
  if (!res.ok) throw new Error(`tldv transcript error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (Array.isArray(data.data)) {
    return data.data
      .map((u) => `${u.speaker}: ${u.text.replace(/\s+/g, " ").trim()}`)
      .join("\n");
  }
  return JSON.stringify(data);
}

export function extractProspect(meeting) {
  const invitees = meeting.invitees || [];
  const prospect = invitees.find(
    (p) => p.email && !p.email.includes("fastfwdus.com")
  );
  if (prospect) return { email: prospect.email, name: prospect.name || null };
  return { email: null, name: null };
}
