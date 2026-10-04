/**
 * SMS via Africa's Talking (https://developers.africastalking.com/docs/sms/sending).
 * Not configured → messages are only logged, so the app works without an SMS account.
 */
export async function sendSms(phone: string, message: string, env: Record<string, string | undefined> = process.env) {
  const username = env.AT_USERNAME;
  const apiKey = env.AT_API_KEY;
  if (!username || !apiKey) {
    // In development the text (including reset codes) is logged so flows can be tested without SMS.
    if (env.NODE_ENV === "production") console.warn(`[sms disabled] message to ${phone} not sent: set AT_USERNAME/AT_API_KEY`);
    else if (env.NODE_ENV !== "test") console.info(`[sms disabled] to ${phone}: ${message}`);
    return false;
  }
  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to: `+${phone.replace(/^\+/, "")}`, message });
  if (env.AT_SENDER_ID) body.set("from", env.AT_SENDER_ID);
  try {
    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (error) {
    console.error("SMS failed", error);
    return false;
  }
}
