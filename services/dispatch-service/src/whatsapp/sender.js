import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('dispatch-service');

export async function sendWhatsApp({ recipient, body, templateCode, credentials, isSandbox }) {
  if (isSandbox || !credentials?.phoneNumberId || !credentials?.accessToken) {
    logger.info({ recipient, templateCode }, '[SANDBOX] WhatsApp simulated');
    return { success: true, providerMessageId: `wamid.sandbox.${Date.now()}` };
  }

  const url = `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: templateCode ? 'template' : 'text',
    ...(templateCode ? { template: { name: templateCode, language: { code: 'id' } } } : { text: { body } })
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${credentials.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Meta WA API Error');

  return { success: true, providerMessageId: data.messages?.[0]?.id || `wamid_${Date.now()}` };
}
