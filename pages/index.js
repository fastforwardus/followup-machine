import { useState, useEffect } from "react";

const NAVY = "#27295C";
const GOLD = "#e8b84b";
const LOGO = "https://fastfwdus.com/wp-content/uploads/2025/04/logorwhitehorizontal.png";

export default function ReviewDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchDrafts(); }, []);

  async function fetchDrafts() {
    setLoading(true);
    const res = await fetch("/api/drafts");
    const data = await res.json();
    setDrafts(data.drafts || []);
    setLoading(false);
  }

  function selectDraft(draft) {
    setSelected(draft);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  }

  async function sendDraft() {
    setSending(true);
    try {
      const res = await fetch("/api/approve-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: selected.id, subject: editSubject, body: editBody }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`✓ Enviado a ${data.sent_to}`);
        setSelected(null);
        fetchDrafts();
      } else {
        showToast("Error al enviar");
      }
    } finally {
      setSending(false);
    }
  }

  async function discardDraft(id) {
    await fetch("/api/discard-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: id }) });
    showToast("Borrador descartado");
    if (selected?.id === id) setSelected(null);
    fetchDrafts();
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const EmailPreview = ({ subject, body }) => (
    <div style={{ fontFamily: "'Trebuchet MS', sans-serif", border: "1px solid #e8e8e8", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ background: `linear-gradient(160deg, #1a1c4a 0%, ${NAVY} 50%, #3a3c7a 100%)`, padding: "24px 28px" }}>
        <img src={LOGO} alt="FastForward" style={{ height: "20px", display: "block", marginBottom: "12px" }} />
        <div style={{ fontSize: "16px", color: "#fff", fontWeight: "700", lineHeight: "1.3" }}>{subject}</div>
        <div style={{ width: "28px", height: "2px", background: GOLD, marginTop: "10px" }} />
      </div>
      <div style={{ padding: "24px 28px", background: "#fff" }}>
        <div style={{ fontSize: "13px", color: "#3a3f55", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{body}</div>
      </div>
      <div style={{ padding: "14px 28px", background: "#fff", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ display: "inline-block", background: GOLD, color: "#0a0c1e", padding: "10px 24px", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px" }}>
          AGENDAR LLAMADA →
        </div>
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#aaa" }}>Carlos · CEO – FastForward LLC</div>
      </div>
      <div style={{ background: NAVY, padding: "12px 28px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px" }}>FASTFWDUS.COM</div>
        <div style={{ fontSize: "9px", color: GOLD, letterSpacing: "2px" }}>MIAMI · FL</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#f5f6fa", minHeight: "100vh", fontFamily: "'Helvetica Neue', Helvetica, sans-serif" }}>

      {/* Topbar */}
      <div style={{ background: NAVY, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
        <img src={LOGO} alt="FastForward" style={{ height: "20px" }} />
        <div style={{ color: GOLD, fontSize: "10px", letterSpacing: "3px" }}>REVISIÓN DE CORREOS</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "340px 1fr" : "1fr", gap: "0", minHeight: "calc(100vh - 56px)" }}>

        {/* Lista de borradores */}
        <div style={{ background: "#fff", borderRight: "1px solid #e8e8e8", padding: "24px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "3px", marginBottom: "20px" }}>
            PENDIENTES ({drafts.length})
          </div>

          {loading && <div style={{ color: "#ccc", fontSize: "13px" }}>Cargando...</div>}

          {!loading && drafts.length === 0 && (
            <div style={{ color: "#ccc", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
              No hay correos pendientes
            </div>
          )}

          {drafts.map((d) => (
            <div
              key={d.id}
              onClick={() => selectDraft(d)}
              style={{
                padding: "16px",
                marginBottom: "8px",
                border: `1px solid ${selected?.id === d.id ? NAVY : "#eee"}`,
                borderLeft: `3px solid ${selected?.id === d.id ? GOLD : "#eee"}`,
                cursor: "pointer",
                background: selected?.id === d.id ? "#f8f9ff" : "#fff",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ fontSize: "11px", color: NAVY, fontWeight: "700", letterSpacing: "1px" }}>
                  EMAIL #{d.email_number}
                </div>
                <div style={{ fontSize: "10px", color: "#ccc" }}>
                  {new Date(d.sent_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "#333", fontWeight: "500", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {d.followup_sequences?.prospect_name || d.followup_sequences?.prospect_email}
              </div>
              <div style={{ fontSize: "12px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {d.subject}
              </div>
            </div>
          ))}
        </div>

        {/* Panel de edición y preview */}
        {selected && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", background: "#f5f6fa" }}>

            {/* Editor */}
            <div style={{ padding: "28px", borderRight: "1px solid #e8e8e8", background: "#fff" }}>
              <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "3px", marginBottom: "20px" }}>
                EDITOR
              </div>

              <div style={{ marginBottom: "6px", fontSize: "11px", color: "#888", letterSpacing: "1px" }}>PARA</div>
              <div style={{ fontSize: "14px", color: NAVY, fontWeight: "600", marginBottom: "20px" }}>
                {selected.followup_sequences?.prospect_email}
              </div>

              <div style={{ marginBottom: "6px", fontSize: "11px", color: "#888", letterSpacing: "1px" }}>ASUNTO</div>
              <input
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1px solid #e0e0e0", padding: "10px 12px",
                  fontSize: "14px", color: "#333", marginBottom: "20px",
                  outline: "none", fontFamily: "inherit",
                }}
              />

              <div style={{ marginBottom: "6px", fontSize: "11px", color: "#888", letterSpacing: "1px" }}>CUERPO</div>
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1px solid #e0e0e0", padding: "12px",
                  fontSize: "14px", color: "#333", lineHeight: "1.7",
                  height: "280px", resize: "vertical", outline: "none",
                  fontFamily: "inherit",
                }}
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={sendDraft}
                  disabled={sending}
                  style={{
                    flex: 1, background: sending ? "#ccc" : NAVY,
                    color: "#fff", border: "none", padding: "13px",
                    fontSize: "12px", fontWeight: "700", letterSpacing: "2px",
                    cursor: sending ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "ENVIANDO..." : "ENVIAR →"}
                </button>
                <button
                  onClick={() => discardDraft(selected.id)}
                  style={{
                    background: "#fff", color: "#ccc",
                    border: "1px solid #e0e0e0", padding: "13px 20px",
                    fontSize: "12px", cursor: "pointer",
                  }}
                >
                  DESCARTAR
                </button>
              </div>
            </div>

            {/* Preview */}
            <div style={{ padding: "28px", overflowY: "auto" }}>
              <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "3px", marginBottom: "20px" }}>
                PREVIEW
              </div>
              <EmailPreview subject={editSubject} body={editBody} />
            </div>

          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: NAVY, color: "#fff", padding: "12px 28px",
          fontSize: "13px", letterSpacing: "1px", borderLeft: `3px solid ${GOLD}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
