import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirmá tu email en SoporteML',
  invite: 'Te invitaron a SoporteML',
  magiclink: 'Tu enlace de acceso a SoporteML',
  recovery: 'Restablecé tu contraseña',
  email_change: 'Confirmá el cambio de email',
  reauthentication: 'Tu código de verificación',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = "SoporteML"
const ROOT_DOMAIN = Deno.env.get("ROOT_DOMAIN") || "soporteml.com"
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || `noreply@notify.soporteml.com`

async function sendResendEmail(payload: { to: string; subject: string; html: string; text: string }) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: SENDER_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHookSecret = Deno.env.get('AUTH_HOOK_SECRET');
    const signature = req.headers.get('x-auth-hook-signature');

    // Simple secret verification if configured
    if (authHookSecret && signature !== authHookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    
    // Supabase Auth Hook payload structure
    // Reference: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
    const { user, email_data } = payload;
    const emailType = email_data.email_action_type;
    
    console.log('Received auth email event', { emailType, email: user.email });

    const EmailTemplate = EMAIL_TEMPLATES[emailType];
    if (!EmailTemplate) {
      console.error('Unknown email type', { emailType });
      return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient: user.email,
      confirmationUrl: email_data.confirmation_url || email_data.url,
      token: email_data.token,
      email: user.email,
      newEmail: email_data.new_email,
    };

    const html = await renderAsync(React.createElement(EmailTemplate, templateProps));
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
      plainText: true,
    });

    await sendResendEmail({
      to: user.email,
      subject: EMAIL_SUBJECTS[emailType] || 'Notificación',
      html,
      text,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Email hook error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
