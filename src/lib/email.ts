import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY!,
});

type SendEmailOptions = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
};

export async function sendEmail({
  to,
  toName,
  subject,
  html,
}: SendEmailOptions) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing");
  }

  if (!process.env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL is missing");
  }

  return await brevo.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME || "TrendX OS",
    },

    to: [
      {
        email: to,
        name: toName,
      },
    ],

    subject,

    htmlContent: html,
  });
}

type SendTaskEmailOptions = {
  to: string;
  employeeName: string;
  taskTitle: string;
  clientName: string;
  dueDate: string;
};

export async function sendTaskEmail({
  to,
  employeeName,
  taskTitle,
  clientName,
  dueDate,
}: SendTaskEmailOptions) {
  return await sendEmail({
    to,
    toName: employeeName,
    subject: `تم إسناد مهمة جديدة إليك - ${taskTitle}`,

    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; background:#f8fafc; padding:30px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:16px; padding:30px; border:1px solid #e2e8f0;">
          
          <h2 style="margin-top:0; color:#0f172a;">
            مرحبًا ${employeeName}
          </h2>

          <p style="color:#475569; font-size:16px;">
            تم إسناد مهمة جديدة إليك على نظام TrendX OS.
          </p>

          <div style="background:#f8fafc; border-radius:12px; padding:20px; margin:20px 0;">
            
            <p style="margin:8px 0;">
              <strong>المهمة:</strong>
              ${taskTitle}
            </p>

            <p style="margin:8px 0;">
              <strong>العميل:</strong>
              ${clientName}
            </p>

            <p style="margin:8px 0;">
              <strong>موعد التسليم:</strong>
              ${dueDate}
            </p>

          </div>

          <p style="color:#475569;">
            برجاء الدخول إلى TrendX OS لمراجعة تفاصيل المهمة والبدء في تنفيذها.
          </p>

          <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e2e8f0;">
            <p style="margin:0; color:#64748b; font-size:14px;">
              TrendX OS
            </p>
          </div>

        </div>
      </div>
    `,
  });
}