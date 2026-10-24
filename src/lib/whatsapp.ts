type SendWhatsAppOptions = {
  to: string;
  message: string;
};

/**
 * Accept Egyptian mobile numbers as entered in the employee form (01...),
 * while preserving WhatsApp group JIDs and other international numbers.
 * Baileys requires a country code for individual recipients.
 */
function normalizeWhatsAppRecipient(to: string): string {
  const recipient = to.trim();

  if (/^\d+@g\.us$/.test(recipient)) {
    return recipient;
  }

  if (recipient.endsWith("@g.us")) {
    throw new Error("Invalid WhatsApp group ID");
  }

  let digits = recipient.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // 01012345678 => 201012345678; 1012345678 => 201012345678
  if (/^01[0125]\d{8}$/.test(digits)) {
    digits = `20${digits.slice(1)}`;
  } else if (/^1[0125]\d{8}$/.test(digits)) {
    digits = `20${digits}`;
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("Invalid WhatsApp phone number");
  }

  return digits;
}

export async function sendWhatsAppMessage({
  to,
  message,
}: SendWhatsAppOptions) {
  const serviceUrl =
    process.env.WHATSAPP_SERVICE_URL;

  const token =
    process.env.WHATSAPP_SERVICE_TOKEN;

  if (!serviceUrl) {
    throw new Error(
      "WHATSAPP_SERVICE_URL is missing"
    );
  }

  if (!token) {
    throw new Error(
      "WHATSAPP_SERVICE_TOKEN is missing"
    );
  }

  if (!to) {
    throw new Error(
      "WhatsApp phone number is missing"
    );
  }

  const recipient = normalizeWhatsAppRecipient(to);

  const response = await fetch(
    `${serviceUrl}/send`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-api-token": token,
      },

      body: JSON.stringify({
        to: recipient,
        message,
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Failed to send WhatsApp message"
    );
  }

  return data;
}