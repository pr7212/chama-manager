const ussdService = require('../services/ussdService');

exports.handleUssd = async (req, res) => {
  try {
    const response = await ussdService.handleUssdSession({
      sessionId: req.body.sessionId,
      serviceCode: req.body.serviceCode,
      phoneNumber: req.body.phoneNumber,
      text: req.body.text,
    });

    return res.type('text/plain').status(200).send(response);
  } catch (error) {
    console.error('USSD error:', error.message);
    return res
      .type('text/plain')
      .status(200)
      .send('END Sorry, we could not process your request. Please try again later.');
  }
};
