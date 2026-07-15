/**
 * MediTrace Email Edge Function
 *
 * Deploy: supabase functions deploy send-email --no-verify-jwt
 * Set secret: supabase secrets set RESEND_API_KEY=re_YOUR_KEY_HERE
 *
 * Accepts JSON: { to, subject?, resetUrl?, expiresAt?, type?, app? }
 *   type = 'password-reset' | 'welcome' | 'notification'
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_ADDRESS = 'MediTrace <noreply@meditrace.app>'
const FROM_TEST = 'MediTrace <onboarding@resend.dev>' // fallback until domain is verified

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

        // Send via Resend API
        let res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_ADDRESS,
                to: [body.to],
                subject: email.subject,
                html: email.html,
            }),
        })

        let data = await res.json()

        // Fallback to Resend's test sender if the custom domain is not yet verified
        if (!res.ok && data?.message?.includes('domain')) {
            console.warn('Domain not verified, falling back to test sender:', data)
            res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: FROM_TEST,
                    to: [body.to],
                    subject: email.subject,
                    html: email.html,
                }),
            })
            data = await res.json()
        }

        if (!res.ok) {
            console.error('Resend error:', data)
            return new Response(JSON.stringify({ error: 'Invio email fallito', detail: data }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({ success: true, id: data.id }), {
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
