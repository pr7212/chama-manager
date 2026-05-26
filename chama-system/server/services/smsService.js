const AfricasTalking = require('africastalking');

const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});

const sms = africastalking.SMS;

const sendSMS = async (to, message) => {
  try {
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

module.exports = {
  sendSMS,
};
