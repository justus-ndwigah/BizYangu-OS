// Minimal client for Safaricom's M-PESA Daraja API (STK Push / Lipa na M-PESA Online).
// All calls are optional: if credentials aren't configured, callers fall back to
// simulation so the app is fully usable for local development and demos.
import { HttpError } from '../middlewares/errorHandler';

export interface DarajaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  env: 'sandbox' | 'production';
}

export function getDarajaConfig(): DarajaConfig | null {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
    return null;
  }

  return {
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackUrl,
    env: process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox',
  };
}

function baseUrl(env: 'sandbox' | 'production') {
  return env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function getAccessToken(config: DarajaConfig): Promise<string> {
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
  const res = await fetch(`${baseUrl(config.env)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) {
    throw new HttpError(502, 'Failed to authenticate with M-PESA. Check MPESA_* environment variables.');
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseDescription: string;
}

// Normalizes 07xxxxxxxx / 01xxxxxxxx / +2547xxxxxxxx into 2547xxxxxxxx (Daraja's required format).
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) return `254${digits}`;
  return digits;
}

export async function initiateStkPush(
  config: DarajaConfig,
  phone: string,
  amount: number,
  accountReference: string,
): Promise<StkPushResult> {
  const accessToken = await getAccessToken(config);
  const ts = timestamp();
  const password = Buffer.from(`${config.shortcode}${config.passkey}${ts}`).toString('base64');
  const normalizedPhone = normalizePhone(phone);

  const res = await fetch(`${baseUrl(config.env)}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: normalizedPhone,
      PartyB: config.shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: accountReference.slice(0, 12),
      TransactionDesc: 'BizYangu OS sale',
    }),
  });

  const data = (await res.json()) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };

  if (!res.ok || !data.CheckoutRequestID) {
    throw new HttpError(502, data.errorMessage ?? data.ResponseDescription ?? 'STK push failed');
  }

  return {
    merchantRequestId: data.MerchantRequestID ?? '',
    checkoutRequestId: data.CheckoutRequestID,
    responseDescription: data.ResponseDescription ?? 'Success',
  };
}