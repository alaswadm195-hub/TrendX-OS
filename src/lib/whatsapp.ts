type SendWhatsAppOptions = {
  to: string;
  message: string;
};

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
        to,
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