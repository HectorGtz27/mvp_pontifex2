const chatbotService = require('../services/chatbotService.cjs')

exports.handleChat = async (req, res, next) => {
  console.log('[DEBUG chatbotController] handleChat llamado', { body: req.body });
  try {
    const question = req.body?.question;
    console.log('[DEBUG chatbotController] Pregunta recibida:', question);
    if (!question || typeof question !== 'string' || question.length < 3 || question.length > 500) {
      console.log('[DEBUG chatbotController] Pregunta inválida:', question);
      return res.status(400).json({ error: 'Pregunta inválida.' });
    }

    const user = { id: 'default', role: 'admin' };
    const history = req.body?.history || [];
    const solicitudId = req.body?.solicitudId || null;

    console.log('[DEBUG chatbotController] History:', history);
    console.log('[DEBUG chatbotController] solicitudId:', solicitudId);

    const response = await chatbotService.processQuestion(question, user, history, solicitudId);
    console.log('[DEBUG chatbotController] Respuesta de chatbotService:', response);
    res.json({ response });
    console.log('[DEBUG chatbotController] Respuesta enviada al frontend');
  } catch (err) {
    console.error('[Chatbot] Error:', err);
    next(err);
  }
};