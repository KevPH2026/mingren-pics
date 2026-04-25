// Telegram notification helper — sends new user registration alerts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID;

export async function notifyNewRegistration(email: string, referralCode: string, hasInviter: boolean) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('[notify] TELEGRAM_BOT_TOKEN or TELEGRAM_NOTIFY_CHAT_ID not set, skipping');
    return;
  }

  const masked = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  const inviterLine = hasInviter ? '📎 通过邀请码注册' : '🆕 自然注册';

  const text = [
    '🎉 <b>新用户注册</b>',
    `📧 ${masked}`,
    `🎫 邀请码: <code>${referralCode}</code>`,
    inviterLine,
    `🕐 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
  ].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_notification: false,
      }),
    });
    if (!res.ok) {
      console.error('[notify] Telegram API error:', await res.text());
    }
  } catch (e: any) {
    console.error('[notify] Failed to send Telegram notification:', e.message);
  }
}
