import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens, getConnectedEmailAddress } from '@/lib/google/gmail';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const orgId = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (errorParam) {
    return NextResponse.redirect(`${appUrl}/settings?gmail=cancelled`);
  }

  if (!code || !orgId) {
    return NextResponse.redirect(`${appUrl}/settings?gmail=error`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      throw new Error('No refresh_token returned by Google');
    }
    if (!tokens.access_token) {
      throw new Error('No access_token returned by Google');
    }

    const emailAddress = await getConnectedEmailAddress(tokens.access_token);
    if (!emailAddress) {
      throw new Error('Could not determine connected Gmail address');
    }

    const admin = getAdminClient();
    const { error: upsertError } = await admin
      .from('email_connections')
      .upsert(
        {
          org_id: orgId,
          provider: 'gmail',
          email_address: emailAddress,
          refresh_token: tokens.refresh_token,
        },
        { onConflict: 'org_id,provider' }
      );

    if (upsertError) throw new Error(upsertError.message);

    return NextResponse.redirect(`${appUrl}/settings?gmail=connected`);
  } catch (err) {
    console.error('Gmail OAuth callback failed:', err);
    return NextResponse.redirect(`${appUrl}/settings?gmail=error`);
  }
}