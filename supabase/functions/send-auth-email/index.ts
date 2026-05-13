/**
 * Edge Function: надсилання HTML-листів через SMTP (секрети в Supabase → Edge Functions → Secrets).
 *
 * Обовʼязкові secrets:
 *   SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * Опційні:
 *   SMTP_PORT (за замовчуванням 587)
 *   SMTP_SECURE — "true" для порту 465 (SSL)
 *
 * Деплой: supabase functions deploy send-auth-email
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";

type Payload = { to: string; subject: string; html: string; text?: string };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body?.to || !body?.subject || !body?.html) {
    return new Response(JSON.stringify({ error: "Missing to, subject or html" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const host = Deno.env.get("SMTP_HOST")?.trim();
  const user = Deno.env.get("SMTP_USER")?.trim();
  const pass = Deno.env.get("SMTP_PASS")?.trim();
  const from = Deno.env.get("EMAIL_FROM")?.trim();

  if (!host || !user || !pass || !from) {
    return new Response(
      JSON.stringify({
        error:
          "Missing SMTP secrets. Set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM in Supabase (Edge Function secrets).",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const port = Number(Deno.env.get("SMTP_PORT")?.trim() || "587");
  const secure = Deno.env.get("SMTP_SECURE")?.trim() === "true" || port === 465;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({
      from,
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
    });
  } catch (e) {
    console.error("SMTP send failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: "smtp_send_failed", detail: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
