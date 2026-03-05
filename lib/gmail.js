import { google } from "googleapis";
import { buildEmailHTML } from "./email-template.js";

function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth });
}

function buildRawEmail({ to, subject, htmlBody, inReplyTo, references }) {
  const from = "Carlos | FastForward LLC <info@fastfwdus.com>";
  let headers = [
    "From: " + from,
    "To: " + to,
    "Subject: " + subject,
    "Content-Type: text/html; charset=UTF-8",
    "MIME-Version: 1.0",
  ];
  if (inReplyTo) headers.push("In-Reply-To: " + inReplyTo);
  if (references) headers.push("References: " + references);
  const email = [...headers, "", htmlBody].join("\r\n");
  return Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendEmail({ to, subject, body, threadId, inReplyTo, references }) {
  const gmail = getGmailClient();
  const htmlBody = buildEmailHTML({ subject, body });
  const raw = buildRawEmail({ to, subject, htmlBody, inReplyTo, references });
  const params = { userId: "me", requestBody: { raw } };
  if (threadId) params.requestBody.threadId = threadId;
  const res = await gmail.users.messages.send(params);
  return { threadId: res.data.threadId, messageId: res.data.id };
}

export async function checkThreadForReply(threadId) {
  const gmail = getGmailClient();
  try {
    const res = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: ["From"],
    });
    for (const msg of res.data.messages || []) {
      const from = msg.payload?.headers?.find((h) => h.name === "From")?.value || "";
      if (!from.includes("fastfwdus.com")) return true;
    }
    return false;
  } catch (e) {
    console.error("Error checking thread " + threadId + ":", e.message);
    return false;
  }
}
