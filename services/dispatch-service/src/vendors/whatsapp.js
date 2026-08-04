/**
 * WhatsApp Meta Business Cloud API Adapter
 */
export async function sendWhatsAppMessage({ recipient, body, templateCode, variables, credentials }) {
  // If sandbox or credentials not provided, simulate successful dispatch
  if (!credentials || !credentials.phoneNumberId || !credentials.accessToken) {
    console.log(`[SIMULATION WA] Sending to ${recipient}: ${body || templateCode}`);
    return {
      success: true,
      providerMessageId: `wamid.hbg.${Date.now()}`
    };
  }

  const url = `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: templateCode ? 'template' : 'text',
    ...(templateCode ? {
      template: {
        name: templateCode,
        language: { code: 'id' }
      }
    } : {
      text: { body }
    })
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || 'Meta WhatsApp API Error');
  }

  return {
    success: true,
    providerMessageId: data.messages?.[0]?.id || `wamid_${Date.now()}`
  };
}
