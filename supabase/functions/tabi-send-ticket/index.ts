// TABI TABI PO — confirmation email with QR ticket.
// Called by a database trigger ({id}) after each RSVP, and by a 30-minute cron sweep ({sweep:true}).
// No auth header needed: it only ever emails rows already in the database, each at most once.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   required — from resend.com
//   EMAIL_FROM       e.g. "Tabi Tabi Po <tickets@zhostel.com>" (domain must be verified in Resend)
//   EMAIL_REPLY_TO   optional, e.g. "marketing@zhostel.com"
//   SITE_URL         optional, defaults to the GitHub Pages URL
//   EVENT_TIME       optional, defaults to "9PM"
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import QRCode from "npm:qrcode@1.5.4";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("EMAIL_FROM") ?? "Tabi Tabi Po <onboarding@resend.dev>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "marketing@zhostel.com";
const SITE = (Deno.env.get("SITE_URL") ?? "https://itsoleiya.github.io/tabi-tabi-po/").replace(/\/?$/, "/");
const TIME = Deno.env.get("EVENT_TIME") ?? "9PM";
const NIGHT_LABEL: Record<string, string> = { "2026-10-30": "Fri, Oct 30", "2026-10-31": "Sat, Oct 31" };
const whenFor = (nights: string[] | null) =>
  ((nights && nights.length ? nights : Object.keys(NIGHT_LABEL)).map((n) => NIGHT_LABEL[n] ?? n).join(" & ")) + " · " + TIME;
const TYPE_LABEL: Record<string, string> = { sponsor: "Sponsor guest", media: "Media", artist: "Artist", vip: "VIP" };

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Row = { id: string; ticket_code: string; full_name: string; email: string; guest_type: string; nights: string[] | null };

async function claim(id: string): Promise<Row | null> {
  const { data } = await db.from("tabi_rsvps")
    .update({ email_status: "sending", updated_at: new Date().toISOString() })
    .eq("id", id).eq("email_status", "pending").not("consent_at", "is", null)
    .select("id,ticket_code,full_name,email,guest_type,nights").maybeSingle();
  return (data as Row) ?? null;
}

function html(r: Row, link: string) {
  const badge = TYPE_LABEL[r.guest_type]
    ? `<p style="margin:0 0 10px"><span style="background:#F5C518;color:#131311;font-weight:800;font-size:12px;letter-spacing:2px;padding:4px 10px;border-radius:999px;text-transform:uppercase">${TYPE_LABEL[r.guest_type]}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#131311;font-family:Arial,Helvetica,sans-serif;color:#F2EFE6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#131311"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
<tr><td align="center" style="padding-bottom:6px;font-size:12px;letter-spacing:5px;text-transform:uppercase;color:#F2EFE6">Salakot opening night · Halloween</td></tr>
<tr><td align="center" style="padding-bottom:22px;font-size:40px;font-weight:900;letter-spacing:-1px;color:#F2EFE6;text-shadow:0 0 18px rgba(245,197,24,.6)">TABI TABI PO</td></tr>
<tr><td style="background:#F2EFE6;border-radius:18px;padding:26px;text-align:center;color:#131311">
${badge}
<p style="margin:0 0 4px;font-size:16px">You're on the list,</p>
<p style="margin:0 0 18px;font-size:24px;font-weight:800">${esc(r.full_name)}</p>
<img src="cid:ticket-qr" width="240" height="240" alt="QR ticket ${esc(r.ticket_code)}" style="display:block;margin:0 auto 14px;width:240px;height:240px">
<p style="margin:0 0 4px;font-size:22px;font-weight:800;letter-spacing:2px">${esc(r.ticket_code)}</p>
<p style="margin:0 0 18px;font-size:14px;color:#555">${esc(whenFor(r.nights))} · Salakot at Z Hostel</p>
<a href="${link}" style="display:inline-block;background:#131311;color:#F5C518;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:999px">Open my ticket</a>
</td></tr>
<tr><td style="padding:22px 6px 0;font-size:14px;line-height:1.6;color:#cfccc4">
<b style="color:#F2EFE6">At the door:</b> show this QR (the image is also attached) and a valid ID with the same name. 18+ only. Your ticket is valid for ${esc(whenFor(r.nights).split(" · ")[0])}, once per night.<br><br>
<b style="color:#F2EFE6">Venue:</b> Salakot at Z Hostel, 5660 Don Pedro Street, Poblacion, Makati<br>
<b style="color:#F2EFE6">Best in costume:</b> come as a Filipino myth.<br><br>
Staying the night? <a href="https://zhostel.com/" style="color:#F5C518">Book a bed at Z Hostel</a>.<br><br>
<span style="font-size:12px;color:#8a877f">You're receiving this because you RSVP'd at ${esc(SITE)}. Questions or data requests: ${esc(REPLY_TO)}.</span>
</td></tr></table></td></tr></table></body></html>`;
}

async function send(r: Row): Promise<"sent" | "retry" | "failed"> {
  try {
    const png = await QRCode.toBuffer(r.ticket_code, { width: 600, margin: 2, errorCorrectionLevel: "M", color: { dark: "#131311", light: "#F2EFE6" } });
    const link = `${SITE}?ticket=${encodeURIComponent(r.ticket_code)}&n=${encodeURIComponent(r.full_name)}` +
      (r.nights?.length ? `&d=${r.nights.join(",")}` : "") + (r.guest_type !== "guest" ? `&t=${r.guest_type}` : "") + "#rsvp";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "Idempotency-Key": `tabi-${r.id}` },
      body: JSON.stringify({
        from: FROM, to: [r.email], reply_to: REPLY_TO,
        subject: `Your Tabi Tabi Po ticket · ${r.ticket_code}`,
        html: html(r, link),
        text: `You're on the list, ${r.full_name}.\nTicket: ${r.ticket_code}\n${whenFor(r.nights)} · Salakot at Z Hostel, 5660 Don Pedro St, Poblacion, Makati\nOpen your ticket: ${link}\nBring a valid ID with the same name. 18+ only.`,
        attachments: [{ filename: `tabi-tabi-po-${r.ticket_code}.png`, content: encodeBase64(png), content_id: "ticket-qr" }],
      }),
    });
    if (res.ok) {
      await db.from("tabi_rsvps").update({ email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null }).eq("id", r.id);
      return "sent";
    }
    const err = (await res.text()).slice(0, 300);
    const retry = res.status === 429 || res.status >= 500;
    await db.from("tabi_rsvps").update({ email_status: retry ? "pending" : "failed", email_error: `${res.status}: ${err}` }).eq("id", r.id);
    return retry ? "retry" : "failed";
  } catch (e) {
    await db.from("tabi_rsvps").update({ email_status: "pending", email_error: String(e).slice(0, 300) }).eq("id", r.id);
    return "retry";
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: { id?: string; sweep?: boolean; dryrun?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body */ }

  if (body.dryrun) {
    const png = await QRCode.toBuffer("TTP-TEST00", { width: 600, margin: 2 });
    return json({ ok: true, configured: !!KEY, qr_png_bytes: png.length });
  }
  if (!KEY) return json({ ok: true, configured: false, note: "RESEND_API_KEY not set; RSVPs stay queued." });

  if (body.id) {
    const r = await claim(body.id);
    return json({ ok: true, result: r ? await send(r) : "nothing_to_send" });
  }
  if (body.sweep) {
    // Release rows stuck in 'sending' (crashed mid-send) back to the queue.
    await db.from("tabi_rsvps").update({ email_status: "pending" })
      .eq("email_status", "sending").lt("updated_at", new Date(Date.now() - 10 * 60e3).toISOString());
    const { data } = await db.from("tabi_rsvps").select("id").eq("email_status", "pending")
      .not("consent_at", "is", null).order("created_at").limit(40);
    const out = { sent: 0, retry: 0, failed: 0 };
    for (const { id } of data ?? []) {
      const r = await claim(id);
      if (!r) continue;
      const res = await send(r);
      out[res]++;
      if (res === "retry") break; // rate-limited or provider down: stop, cron will try again
    }
    return json({ ok: true, ...out });
  }
  return json({ error: "Nothing to do" }, 400);
});
