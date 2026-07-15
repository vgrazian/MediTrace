/**
 * MediTrace Email Edge Function
 *
 * Deploy: supabase functions deploy send-email --no-verify-jwt
 * Set secrets:
 *   supabase secrets set GMAIL_USER=meditrace0@gmail.com
 *   supabase secrets set GMAIL_APP_PASSWORD=your_16_char_app_password
 *
 * Accepts JSON: { to, subject?, resetUrl?, expiresAt?, type?, app? }
 *   type = 'password-reset' | 'welcome' | 'notification'
 *
 * Uses Gmail SMTP directly (no third-party service needed).
 * Requires: 2FA enabled + App Password from https://myaccount.google.com/apppasswords
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const GMAIL_USER = Deno.env.get('GMAIL_USER')!
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
    to: string
    subject?: string
    resetUrl?: string
    expiresAt?: string
    type?: 'password-reset' | 'welcome' | 'notification'
    app?: string
    username?: string
    message?: string
}

function btoaUTF8(str: string): string {
    const bytes = new TextEncoder().encode(str)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
}

function buildPasswordResetEmail(req: EmailRequest) {
    const expiresLabel = req.expiresAt
        ? new Date(req.expiresAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
        : '30 minuti'

    return {
        subject: req.subject || 'MediTrace — Reset Password',
        html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <h1 style="color:#1e6f6b;font-size:1.3rem;font-weight:500;margin:0 0 1rem">MediTrace</h1>
        <p>Hai richiesto il reset della password per il tuo account MediTrace.</p>
        <p style="margin:1.5rem 0">
          <a href="${req.resetUrl}"
             style="background:#1e6f6b;color:#fff;padding:.7rem 1.4rem;border-radius:6px;text-decoration:none;font-weight:500">
            Reimposta password
          </a>
        </p>
        <p style="font-size:.85rem;color:#787774">Il link scade alle ${expiresLabel}.</p>
        <p style="font-size:.85rem;color:#787774">Se non hai richiesto il reset, ignora questa email.</p>
        <hr style="border:none;border-top:1px solid #eaeaea;margin:2rem 0">
        <p style="font-size:.75rem;color:#b0b0b0">${req.app || 'MediTrace'} — Gestione farmaci per residenze</p>
      </div>
    `,
    }
}

function buildWelcomeEmail(req: EmailRequest) {
    return {
        subject: req.subject || 'Benvenuto su MediTrace',
        html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <h1 style="color:#1e6f6b;font-size:1.3rem;font-weight:500;margin:0 0 1rem">MediTrace</h1>
        <p>Benvenuto${req.username ? ` ${req.username}` : ''}!</p>
        <p>Il tuo account su MediTrace è stato creato. Usa le credenziali fornite dal tuo amministratore per accedere.</p>
        ${req.message ? `<p style="margin:1rem 0;padding:.8rem;background:#f6fbfa;border-radius:6px;font-family:monospace">${req.message}</p>` : ''}
        <hr style="border:none;border-top:1px solid #eaeaea;margin:2rem 0">
        <p style="font-size:.75rem;color:#b0b0b0">${req.app || 'MediTrace'} — Gestione farmaci per residenze</p>
      </div>
    `,
    }
}

function buildNotificationEmail(req: EmailRequest) {
    return {
        subject: req.subject || 'MediTrace — Notifica',
        html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <h1 style="color:#1e6f6b;font-size:1.3rem;font-weight:500;margin:0 0 1rem">MediTrace</h1>
        <p>${req.message || 'Hai una nuova notifica da MediTrace.'}</p>
        <hr style="border:none;border-top:1px solid #eaeaea;margin:2rem 0">
        <p style="font-size:.75rem;color:#b0b0b0">${req.app || 'MediTrace'} — Gestione farmaci per residenze</p>
      </div>
    `,
    }
}

serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body: EmailRequest = await req.json()

        if (!body.to || typeof body.to !== 'string' || !body.to.includes('@')) {
            return new Response(JSON.stringify({ error: 'Destinatario non valido' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Build email content based on type
        let email: { subject: string; html: string }
        switch (body.type) {
            case 'welcome':
                email = buildWelcomeEmail(body)
                break
            case 'notification':
                email = buildNotificationEmail(body)
                break
            case 'password-reset':
            default:
                email = buildPasswordResetEmail(body)
                break
        }

        // Send via Gmail SMTP
        const conn = await Deno.connectTls({ hostname: 'smtp.gmail.com', port: 465 })
        const buf = new Uint8Array(1024)
        const enc = new TextEncoder()
        const dec = new TextDecoder()

        const send = async (line: string): Promise<string> => {
            await conn.write(enc.encode(line + '\r\n'))
            const n = await conn.read(buf)
            if (n === null) throw new Error('SMTP connection closed')
            const resp = dec.decode(buf.subarray(0, n))
            if (resp.startsWith('4') || resp.startsWith('5')) throw new Error(`SMTP error: ${resp.trim()}`)
            return resp
        }

        try {
            await send(`EHLO meditrace`)
            await send('AUTH LOGIN')
            await send(btoa(GMAIL_USER))
            await send(btoa(GMAIL_APP_PASSWORD))
            await send(`MAIL FROM:<${GMAIL_USER}>`)
            await send(`RCPT TO:<${body.to}>`)
            await send('DATA')
            await send(
                `From: MediTrace <${GMAIL_USER}>\r\n` +
                `To: <${body.to}>\r\n` +
                `Subject: =?UTF-8?B?${btoaUTF8(email.subject)}?=\r\n` +
                `Content-Type: text/html; charset=UTF-8\r\n` +
                `\r\n${email.html}\r\n.`
            )
            await send('QUIT')
        } finally {
            try { conn.close() } catch { /* ignore */ }
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (err) {
        console.error('Edge function error:', err)
        return new Response(JSON.stringify({ error: 'Errore interno' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
