import axios from "axios";

export async function sendWhatsAppMessage({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  try {
    console.log(
      "================================"
    );
    console.log(
      "Sending WhatsApp To:",
      to
    );
    console.log(
      "Message:",
      message
    );
    console.log(
      "================================"
    );

    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    console.log(
      "WhatsApp Success:",
      response.data
    );
  } catch (error: any) {
    console.error(
      "WhatsApp Error Response:",
      error?.response?.data
    );

    console.error(
      "WhatsApp Error:",
      error?.message
    );
  }
}