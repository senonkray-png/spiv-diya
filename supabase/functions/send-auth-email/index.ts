/**
 * Edge Function: надсилання листів з додатку (підтвердження пошти тощо).
 *
 * Секрети в Supabase → Project Settings → Edge Functions → Secrets:
 *   RESEND_API_KEY   — якщо відправляєте через Resend з функції
 *   EMAIL_FROM       — опційно, напр. "СпівДія <noreply@ваш-домен>"
 *
 * Деплой: `supabase functions deploy send-auth-email`
 *
 * Виклик з Next.js: див. `sendViaSupabaseEdge` у src/lib/email.ts
 * (Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendKey) {
    return new Response(
      JSON.stringify({
        error: "RESEND_API_KEY is not set in Edge Function secrets. Add it in Supabase Dashboard.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const from = Deno.env.get("EMAIL_FROM")?.trim() ?? "СпівДія <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend from Edge failed:", res.status, err);
    return new Response(JSON.stringify({ ok: false, status: res.status, detail: err }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
