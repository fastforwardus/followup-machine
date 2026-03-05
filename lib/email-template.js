export function buildEmailHTML({ subject, body }) {
  const NAVY = "#27295C";
  const GOLD = "#e8b84b";

  const bodyHTML = body
    .split("\n")
    .map(line => line.trim() === "" ? "<br/>" : `<span>${line}</span><br/>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2ff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2ff;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:'Trebuchet MS',sans-serif;">

  <tr><td style="background:linear-gradient(160deg,#1a1c4a 0%,${NAVY} 50%,#3a3c7a 100%);padding:40px 40px 32px;">
    <img src="https://fastfwdus.com/wp-content/uploads/2025/04/logorwhitehorizontal.png" alt="FastForward" height="26" style="display:block;margin-bottom:20px;">
    <div style="font-size:22px;color:#ffffff;font-weight:700;line-height:1.25;">${subject}</div>
    <div style="width:40px;height:3px;background:${GOLD};margin-top:16px;"></div>
  </td></tr>

  <tr><td style="background:#ffffff;padding:36px 40px 28px;">
    <div style="font-size:15px;color:#3a3f55;line-height:1.85;">
      ${bodyHTML}
    </div>
  </td></tr>

  <tr><td style="background:#ffffff;padding:0 40px 36px;">
    <a href="https://ffus.link/Video" target="_blank"
       style="display:inline-block;background:${GOLD};color:#0a0c1e;padding:14px 32px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-decoration:none;text-transform:uppercase;">
      Agendar llamada &rarr;
    </a>
    <div style="margin-top:16px;font-size:13px;color:#aaaaaa;">
      Carlos &middot; CEO &ndash; FastForward LLC
    </div>
  </td></tr>

  <tr><td style="background:${NAVY};padding:16px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:2px;">FASTFWDUS.COM</td>
      <td align="right" style="font-size:10px;color:${GOLD};letter-spacing:2px;">MIAMI &middot; FL</td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
