/**
 * Safaricom Daraja (M-Pesa Express / STK Push) client.
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 *
 * All configuration comes from env vars (see .env.example). With MPESA_MOCK=true no network
 * calls are made, which lets the whole checkout flow run locally without Daraja credentials.
 */

export type MpesaConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  transactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  callbackUrl: string;
  mock: boolean;
};

export function getMpesaConfig(env: Record<string, string | undefined> = process.env): MpesaConfig {
  const appUrl = (env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const token = env.MPESA_CALLBACK_TOKEN ?? "";
  const base = env.MPESA_CALLBACK_URL || `${appUrl}/api/mpesa/callback`;
  const callbackUrl = token ? `${base}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : base;
  return {
    baseUrl: env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke",
    consumerKey: env.MPESA_CONSUMER_KEY ?? "",
    consumerSecret: env.MPESA_CONSUMER_SECRET ?? "",
    shortcode: env.MPESA_SHORTCODE ?? "174379",
    passkey: env.MPESA_PASSKEY ?? "",
    transactionType: env.MPESA_TRANSACTION_TYPE === "CustomerBuyGoodsOnline" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
    callbackUrl,
    mock: env.MPESA_MOCK === "true",
  };
}

/** Daraja timestamps are YYYYMMDDHHmmss in Kenyan time (UTC+3, no DST). */
export function darajaTimestamp(date = new Date()): string {
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    eat.getUTCFullYear().toString() +
    pad(eat.getUTCMonth() + 1) +
    pad(eat.getUTCDate()) +
    pad(eat.getUTCHours()) +
    pad(eat.getUTCMinutes()) +
    pad(eat.getUTCSeconds())
  );
}

export function stkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(config: MpesaConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error("M-Pesa is not configured: set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET");
  }
  const basic = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const res = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: string | number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in) * 1000 };
  return body.access_token;
}

export type StkPushResult = {
  merchantRequestId: string;
  checkoutRequestId: string;
  customerMessage: string;
};

export async function stkPush(params: {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
  config?: MpesaConfig;
}): Promise<StkPushResult> {
  const config = params.config ?? getMpesaConfig();
  if (config.mock) {
    const id = `ws_CO_MOCK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return { merchantRequestId: `mock-${id}`, checkoutRequestId: id, customerMessage: "Mock STK push sent" };
  }
  const timestamp = darajaTimestamp();
  const token = await getAccessToken(config);
  const res = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: stkPassword(config.shortcode, config.passkey, timestamp),
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: Math.ceil(params.amount),
      PartyA: params.phone,
      PartyB: config.shortcode,
      PhoneNumber: params.phone,
      CallBackURL: config.callbackUrl,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.description.slice(0, 13),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok || body.ResponseCode !== "0") {
    throw new Error(body.errorMessage || body.ResponseDescription || `STK push failed (${res.status})`);
  }
  return {
    merchantRequestId: body.MerchantRequestID,
    checkoutRequestId: body.CheckoutRequestID,
    customerMessage: body.CustomerMessage,
  };
}

export type StkQueryResult =
  | { state: "pending" }
  | { state: "done"; resultCode: number; resultDesc: string };

/** Asks Daraja for the outcome of an STK push, used when the callback has not arrived. */
export async function stkQuery(checkoutRequestId: string, config = getMpesaConfig()): Promise<StkQueryResult> {
  if (config.mock) return { state: "done", resultCode: 0, resultDesc: "Mock payment succeeded" };
  const timestamp = darajaTimestamp();
  const token = await getAccessToken(config);
  const res = await fetch(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: stkPassword(config.shortcode, config.passkey, timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, string>;
  // While the customer has not yet responded Daraja answers with an error such as
  // "The transaction is being processed" (errorCode 500.001.1001).
  if (body.ResultCode === undefined) return { state: "pending" };
  return { state: "done", resultCode: Number(body.ResultCode), resultDesc: body.ResultDesc ?? "" };
}

export type StkCallback = {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  receipt?: string;
  phone?: string;
};

/** Parses the JSON body Safaricom POSTs to the CallBackURL. Returns null if it is malformed. */
export function parseStkCallback(body: unknown): StkCallback | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null;
  const items =
    ((cb.CallbackMetadata as { Item?: { Name: string; Value?: string | number }[] } | undefined)?.Item ?? []);
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;
  const amount = get("Amount");
  const receipt = get("MpesaReceiptNumber");
  const phone = get("PhoneNumber");
  return {
    merchantRequestId: String(cb.MerchantRequestID ?? ""),
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: Number(cb.ResultCode),
    resultDesc: String(cb.ResultDesc ?? ""),
    amount: amount === undefined ? undefined : Number(amount),
    receipt: receipt === undefined ? undefined : String(receipt),
    phone: phone === undefined ? undefined : String(phone),
  };
}

/**
 * Asks Safaricom who paid a transaction (Daraja Transaction Status API). The answer arrives
 * asynchronously at `resultUrl`; parse it with parseTransactionStatusResult.
 * Needs MPESA_INITIATOR_NAME and MPESA_SECURITY_CREDENTIAL (the initiator password encrypted with
 * Safaricom's certificate, generated on the Daraja portal).
 */
export async function queryTransactionStatus(params: {
  receipt: string;
  resultUrl: string;
  config?: MpesaConfig;
  env?: Record<string, string | undefined>;
}): Promise<void> {
  const config = params.config ?? getMpesaConfig();
  const env = params.env ?? process.env;
  if (!env.MPESA_INITIATOR_NAME || !env.MPESA_SECURITY_CREDENTIAL) {
    throw new Error("M-Pesa name checks need MPESA_INITIATOR_NAME and MPESA_SECURITY_CREDENTIAL");
  }
  const token = await getAccessToken(config);
  const res = await fetch(`${config.baseUrl}/mpesa/transactionstatus/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      Initiator: env.MPESA_INITIATOR_NAME,
      SecurityCredential: env.MPESA_SECURITY_CREDENTIAL,
      CommandID: "TransactionStatusQuery",
      TransactionID: params.receipt,
      PartyA: config.shortcode,
      IdentifierType: "4",
      ResultURL: params.resultUrl,
      QueueTimeOutURL: params.resultUrl,
      Remarks: "Seller name check",
      Occasion: "NameCheck",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok || body.ResponseCode !== "0") {
    throw new Error(body.errorMessage || body.ResponseDescription || `Transaction status query failed (${res.status})`);
  }
}

export type TransactionStatusResult = {
  receipt?: string;
  resultCode: number;
  resultDesc: string;
  /** Registered name of the M-Pesa account that paid, e.g. "JANE WANJIRU KAMAU" */
  payerName?: string;
};

/** Parses the Transaction Status result Safaricom POSTs to the ResultURL. */
export function parseTransactionStatusResult(body: unknown): TransactionStatusResult | null {
  const result = (body as { Result?: Record<string, unknown> })?.Result;
  if (!result || result.ResultCode === undefined) return null;
  const params =
    (result.ResultParameters as { ResultParameter?: { Key: string; Value?: string | number }[] } | undefined)
      ?.ResultParameter ?? [];
  const get = (key: string) => params.find((p) => p.Key === key)?.Value;
  // DebitPartyName looks like "254712345678 - JANE WANJIRU KAMAU".
  const debitParty = get("DebitPartyName");
  const payerName = debitParty === undefined ? undefined : String(debitParty).split(" - ").slice(1).join(" - ").trim() || String(debitParty).trim();
  const receipt = get("ReceiptNo");
  return {
    receipt: receipt === undefined ? undefined : String(receipt),
    resultCode: Number(result.ResultCode),
    resultDesc: String(result.ResultDesc ?? ""),
    payerName,
  };
}
