import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function sendTaskEmail({
  to,
  employeeName,
  taskTitle,
  clientName,
  dueDate,
}: {
  to: string;
  employeeName: string;
  taskTitle: string;
  clientName: string;
  dueDate: string;
}) {
  await resend.emails.send({
    from:
      "TrendX OS <onboarding@resend.dev>",

    to,

    subject: `مهمة جديدة: ${taskTitle}`,

    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl;">
        <h2>مهمة جديدة</h2>

        <p>مرحباً ${employeeName}</p>

        <p>تم إسناد مهمة جديدة إليك.</p>

        <hr />

        <p><strong>المهمة:</strong> ${taskTitle}</p>

        <p><strong>العميل:</strong> ${clientName}</p>

        <p><strong>التسليم:</strong> ${dueDate}</p>

        <p>يرجى الدخول إلى TrendX OS لمتابعة المهمة.</p>
      </div>
    `,
  });
}