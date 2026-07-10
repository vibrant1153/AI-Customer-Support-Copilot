import { google } from 'googleapis';

// Minimal scopes for the "AI drafts a reply inside Gmail" flow:
// - gmail.readonly: read incoming email content (needed to feed the RAG pipeline)
// - gmail.compose:  create/update draft replies (does NOT allow sending —
//   the human agent still has to hit Send themselves inside Gmail)
// Both are RESTRICTED scopes. In "Testing" mode (Google Cloud Console →
// OAuth consent screen) this works immediately for up to 100 test accounts,
// no review needed. Going to real customers later requires Google's
// verification + security assessment process.
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Builds the URL that sends the user to Google's consent screen.
// `state` carries the org_id through the redirect so the callback route
// knows which org this connection belongs to.
export function getAuthUrl(state: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // required to receive a refresh_token
    prompt: 'consent',      // forces Google to always return a refresh_token,
                             // even if the user connected before
    scope: GMAIL_SCOPES,
    state,
  });
}

// Exchanges the one-time `code` Google sends back for real tokens.
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, ... }
}

// Returns an authenticated Gmail API client for a given org, using its
// stored refresh_token. googleapis handles refreshing the short-lived
// access_token automatically behind the scenes.
export function getGmailClientForOrg(refreshToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: client });
}

// Fetches the connected account's own email address — used right after
// OAuth completes, so we know whose inbox this is.
export async function getConnectedEmailAddress(accessToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const res = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
  return res.data.email;
}

// ── Reading messages ──────────────────────────────────────────────

/**
 * Returns the Gmail message ids of recent inbox messages. This is a manual
 * "Sync now" style fetch, not real-time push — real-time delivery requires
 * Gmail's watch() API + a Google Cloud Pub/Sub topic + domain verification,
 * which is real added complexity intentionally deferred for now.
 */
export async function listRecentInboxMessageIds(refreshToken: string, maxResults = 20) {
  const gmail = getGmailClientForOrg(refreshToken);
  const res = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    // Restricts to Gmail's "Primary" category. Without this, a burst of
    // Promotions/Social/Updates mail (which can arrive much faster than
    // real support email) can push genuine customer emails completely
    // outside the most-recent-N window before sync ever sees them.
    // The List-Unsubscribe check in getParsedMessage below is a second,
    // independent layer — it catches bulk mail that Gmail still filed
    // under Primary despite this.
    q: 'category:primary',
    maxResults,
  });
  return (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64').toString('utf-8');
}

function findHeader(headers: { name?: string | null; value?: string | null }[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

// Gmail messages can be plain, or a tree of multipart sections. This walks
// that tree looking for the first text/plain part.
function extractPlainTextBody(payload: any): string {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainTextBody(part);
      if (text) return text;
    }
  }

  // Fallback: a simple message with no explicit mimeType tree
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return '';
}

export interface ParsedGmailMessage {
  gmailMessageId: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  messageIdHeader: string | null; // RFC822 Message-ID, needed for threading replies
  isLikelyBulkMail: boolean; // newsletter/notification, not a real customer inquiry
}

export async function getParsedMessage(
  refreshToken: string,
  messageId: string
): Promise<ParsedGmailMessage> {
  const gmail = getGmailClientForOrg(refreshToken);
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const headers = res.data.payload?.headers;
  const fromRaw = findHeader(headers, 'From') ?? '';
  const subject = findHeader(headers, 'Subject') ?? '(no subject)';
  const messageIdHeader = findHeader(headers, 'Message-ID');

  // "From" headers look like: Jane Doe <jane@example.com> — split name/email
  const match = fromRaw.match(/^(.*?)\s*<(.+)>$/);
  const fromName = match ? match[1].replace(/"/g, '').trim() : fromRaw;
  const fromEmail = match ? match[2].trim() : fromRaw;

  // List-Unsubscribe is a much more reliable "this is bulk mail, not a
  // real customer inquiry" signal than Gmail's own Primary/Promotions
  // tabs — those tabs don't reliably sort every newsletter or automated
  // notification out of Primary (confirmed against a real test inbox).
  // Real customer support emails essentially never carry this header.
  const isLikelyBulkMail =
    findHeader(headers, 'List-Unsubscribe') !== null ||
    findHeader(headers, 'Precedence')?.toLowerCase() === 'bulk';

  return {
    gmailMessageId: messageId,
    threadId: res.data.threadId ?? '',
    fromName: fromName || fromEmail,
    fromEmail,
    subject,
    bodyText: extractPlainTextBody(res.data.payload) || '(empty message)',
    messageIdHeader,
    isLikelyBulkMail,
  };
}

// ── Writing drafts ────────────────────────────────────────────────

function base64UrlEncode(str: string) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface DraftReplyInput {
  threadId: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  inReplyToMessageIdHeader: string | null;
}

/**
 * Creates a draft reply inside the connected Gmail account, threaded to
 * the original message via In-Reply-To/References headers plus Gmail's
 * own threadId. This only creates a draft — it never sends anything.
 * The human agent still has to open Gmail and click Send themselves.
 */
export async function createDraftReply(refreshToken: string, input: DraftReplyInput) {
  const gmail = getGmailClientForOrg(refreshToken);

  const subject = input.subject.toLowerCase().startsWith('re:')
    ? input.subject
    : `Re: ${input.subject}`;

  const headerLines = [
    `To: ${input.toEmail}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (input.inReplyToMessageIdHeader) {
    headerLines.push(`In-Reply-To: ${input.inReplyToMessageIdHeader}`);
    headerLines.push(`References: ${input.inReplyToMessageIdHeader}`);
  }

  const rawMessage = `${headerLines.join('\r\n')}\r\n\r\n${input.bodyText}`;

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: base64UrlEncode(rawMessage),
        threadId: input.threadId,
      },
    },
  });

  return res.data;
}