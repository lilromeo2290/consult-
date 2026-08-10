import AfricasTalking from 'africastalking';

function getATClient() {
  const username = process.env.AT_USERNAME || 'sandbox';
  const apiKey = process.env.AT_API_KEY || '';
  if (!apiKey) {
    console.warn('[SMS] Africa Talking API key not set. SMS will be logged only.');
    return null;
  }
  return AfricasTalking({ username, apiKey });
}

export interface SMSResult {
  success: boolean;
  channel: 'sms';
  phoneNumber: string;
  messageId?: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const client = getATClient();
  const from = process.env.AT_SHORTCODE || 'KpMA';
  let phone = to.replace(/[\s\-]/g, '');
  if (phone.startsWith('0')) phone = '+233' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+' + phone;

  if (!client) {
    console.log(`[SMS LOG] To: ${phone}\nMessage: ${message}`);
    return { success: true, channel: 'sms', phoneNumber: phone };
  }

  try {
    const result = await client.SMS.send({ to: [phone], message, from });
    const status = result.SMSMessageData?.Recipients?.[0];
    if (status?.statusCode === '100' || status?.status === 'Success') {
      return { success: true, channel: 'sms', phoneNumber: phone, messageId: status.messageId };
    }
    return { success: false, channel: 'sms', phoneNumber: phone, error: status?.status || 'Unknown error' };
  } catch (err: any) {
    console.error('[SMS] Send failed:', err.message);
    return { success: false, channel: 'sms', phoneNumber: phone, error: err.message };
  }
}

export interface WhatsAppResult {
  success: boolean;
  channel: 'whatsapp';
  phoneNumber: string;
  messageId?: string;
  error?: string;
}

export async function sendWhatsApp(to: string, message: string, pdfBuffer?: Buffer): Promise<WhatsAppResult> {
  let phone = to.replace(/[\s\-]/g, '');
  if (phone.startsWith('0')) phone = '+233' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+' + phone;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

  if (!accessToken || !phoneNumberId) {
    console.log(`[WHATSAPP LOG] To: ${phone}\nMessage: ${message}\nPDF attached: ${!!pdfBuffer}`);
    return { success: true, channel: 'whatsapp', phoneNumber: phone };
  }

  try {
    const baseUrl = 'https://graph.facebook.com/v18.0';
    const res = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { preview_url: false, body: message } }),
    });
    const json = await res.json();
    if (json.messages?.[0]?.id) {
      return { success: true, channel: 'whatsapp', phoneNumber: phone, messageId: json.messages[0].id };
    }
    return { success: false, channel: 'whatsapp', phoneNumber: phone, error: json.error?.message || 'Unknown WhatsApp API error' };
  } catch (err: any) {
    console.error('[WHATSAPP] Send failed:', err.message);
    return { success: false, channel: 'whatsapp', phoneNumber: phone, error: err.message };
  }
}
