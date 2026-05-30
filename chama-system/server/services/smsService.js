const sendSMS = async (to, message) => {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;

  if (!apiKey || !username) {
    console.warn('SMS skipped: AFRICASTALKING_API_KEY or USERNAME not set');
    return null;
  }

  try {
    const AfricasTalking = require('africastalking');
    const africastalking = AfricasTalking({ apiKey, username });
    const sms = africastalking.SMS;

    const result = await sms.send({
      to: [to],
      message,
      from: process.env.AFRICASTALKING_SHORTCODE,
    });

    console.log('SMS sent:', result);
    return result;
  } catch (error) {
    console.error('SMS sending failed:', error.message);
    throw error;
  }
};

module.exports = { sendSMS };
