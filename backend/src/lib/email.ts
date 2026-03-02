import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@triplocal.jp";
const FROM_NAME = "TripLocal";

interface BookingEmailData {
  to: string;
  guestName: string;
  accommodationName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  bookingId: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<void> {
  const nights = Math.ceil(
    (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  const msg = {
    to: data.to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `【TripLocal】ご予約が確定しました — ${data.accommodationName}`,
    text: `${data.guestName} 様

ご予約が確定しましたのでお知らせいたします。

━━━━━━━━━━━━━━━━━━━━━━
予約内容
━━━━━━━━━━━━━━━━━━━━━━
施設名: ${data.accommodationName}
部屋: ${data.roomName}
チェックイン: ${formatDate(data.checkIn)}
チェックアウト: ${formatDate(data.checkOut)}
宿泊数: ${nights}泊
宿泊人数: ${data.guests}名
合計金額: ${formatPrice(data.totalPrice)}
予約番号: ${data.bookingId}

━━━━━━━━━━━━━━━━━━━━━━
キャンセルポリシー
━━━━━━━━━━━━━━━━━━━━━━
・チェックイン7日前まで: 全額返金
・チェックイン3〜6日前: 宿泊料金の50%返金
・チェックイン2日前〜当日: 返金なし

キャンセルはマイ予約ページから行えます。

━━━━━━━━━━━━━━━━━━━━━━
TripLocal
`,
    html: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1510;">
  <div style="background: #8b6f47; padding: 24px; text-align: center;">
    <h1 style="color: #f5f0e8; margin: 0; font-size: 24px;">TripLocal</h1>
  </div>
  <div style="padding: 32px 24px; background: #f5f0e8;">
    <p style="font-size: 16px;">${data.guestName} 様</p>
    <p style="font-size: 16px;">ご予約が確定しましたのでお知らせいたします。</p>

    <div style="background: #fff; border: 1px solid #ddd6c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h2 style="font-size: 18px; color: #8b6f47; margin-top: 0;">予約内容</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #9e9488;">施設名</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.accommodationName}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">部屋</td><td style="padding: 8px 0; text-align: right;">${data.roomName}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">チェックイン</td><td style="padding: 8px 0; text-align: right;">${formatDate(data.checkIn)}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">チェックアウト</td><td style="padding: 8px 0; text-align: right;">${formatDate(data.checkOut)}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">宿泊数</td><td style="padding: 8px 0; text-align: right;">${nights}泊</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">宿泊人数</td><td style="padding: 8px 0; text-align: right;">${data.guests}名</td></tr>
        <tr style="border-top: 1px solid #ddd6c8;"><td style="padding: 12px 0; font-weight: bold;">合計金額</td><td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #c4621a;">${formatPrice(data.totalPrice)}</td></tr>
      </table>
      <p style="font-size: 12px; color: #9e9488; margin-bottom: 0;">予約番号: ${data.bookingId}</p>
    </div>

    <div style="background: #fff; border: 1px solid #ddd6c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h2 style="font-size: 18px; color: #8b6f47; margin-top: 0;">キャンセルポリシー</h2>
      <ul style="font-size: 14px; padding-left: 20px; line-height: 1.8;">
        <li>チェックイン7日前まで: <strong>全額返金</strong></li>
        <li>チェックイン3〜6日前: <strong>宿泊料金の50%返金</strong></li>
        <li>チェックイン2日前〜当日: <strong>返金なし</strong></li>
      </ul>
    </div>

    <p style="font-size: 14px; color: #9e9488;">キャンセルはマイ予約ページから行えます。</p>
  </div>
  <div style="background: #1a1510; padding: 16px; text-align: center;">
    <p style="color: #9e9488; font-size: 12px; margin: 0;">&copy; TripLocal</p>
  </div>
</div>`,
  };

  try {
    await sgMail.send(msg);
    console.log(`Booking confirmation email sent to ${data.to} for booking ${data.bookingId}`);
  } catch (err) {
    console.error("Failed to send booking confirmation email:", err);
  }
}

interface CancellationEmailData {
  to: string;
  guestName: string;
  accommodationName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  refundAmount: number;
  refundRate: number;
  bookingId: string;
}

export async function sendCancellationEmail(data: CancellationEmailData): Promise<void> {
  const refundLabel =
    data.refundRate === 1 ? "全額返金" :
    data.refundRate === 0.5 ? "50%返金" : "返金なし";

  const msg = {
    to: data.to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `【TripLocal】ご予約がキャンセルされました — ${data.accommodationName}`,
    text: `${data.guestName} 様

ご予約のキャンセルが完了しましたのでお知らせいたします。

━━━━━━━━━━━━━━━━━━━━━━
キャンセル内容
━━━━━━━━━━━━━━━━━━━━━━
施設名: ${data.accommodationName}
部屋: ${data.roomName}
チェックイン: ${formatDate(data.checkIn)}
チェックアウト: ${formatDate(data.checkOut)}
予約金額: ${formatPrice(data.totalPrice)}
返金区分: ${refundLabel}
返金額: ${formatPrice(data.refundAmount)}
予約番号: ${data.bookingId}

${data.refundAmount > 0 ? "返金はお支払いに使用されたカードに処理されます。反映までに5〜10営業日かかる場合があります。" : ""}

━━━━━━━━━━━━━━━━━━━━━━
TripLocal
`,
    html: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1510;">
  <div style="background: #8b6f47; padding: 24px; text-align: center;">
    <h1 style="color: #f5f0e8; margin: 0; font-size: 24px;">TripLocal</h1>
  </div>
  <div style="padding: 32px 24px; background: #f5f0e8;">
    <p style="font-size: 16px;">${data.guestName} 様</p>
    <p style="font-size: 16px;">ご予約のキャンセルが完了しましたのでお知らせいたします。</p>

    <div style="background: #fff; border: 1px solid #ddd6c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h2 style="font-size: 18px; color: #8b6f47; margin-top: 0;">キャンセル内容</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #9e9488;">施設名</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.accommodationName}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">部屋</td><td style="padding: 8px 0; text-align: right;">${data.roomName}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">チェックイン</td><td style="padding: 8px 0; text-align: right;">${formatDate(data.checkIn)}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">チェックアウト</td><td style="padding: 8px 0; text-align: right;">${formatDate(data.checkOut)}</td></tr>
        <tr style="border-top: 1px solid #ddd6c8;"><td style="padding: 12px 0; color: #9e9488;">予約金額</td><td style="padding: 12px 0; text-align: right;">${formatPrice(data.totalPrice)}</td></tr>
        <tr><td style="padding: 8px 0; color: #9e9488;">返金区分</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${refundLabel}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">返金額</td><td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: ${data.refundAmount > 0 ? "#5a7a4a" : "#c4621a"};">${formatPrice(data.refundAmount)}</td></tr>
      </table>
      <p style="font-size: 12px; color: #9e9488; margin-bottom: 0;">予約番号: ${data.bookingId}</p>
    </div>

    ${data.refundAmount > 0 ? '<p style="font-size: 14px; color: #9e9488;">返金はお支払いに使用されたカードに処理されます。反映までに5〜10営業日かかる場合があります。</p>' : ""}
  </div>
  <div style="background: #1a1510; padding: 16px; text-align: center;">
    <p style="color: #9e9488; font-size: 12px; margin: 0;">&copy; TripLocal</p>
  </div>
</div>`,
  };

  try {
    await sgMail.send(msg);
    console.log(`Cancellation email sent to ${data.to} for booking ${data.bookingId}`);
  } catch (err) {
    console.error("Failed to send cancellation email:", err);
  }
}
