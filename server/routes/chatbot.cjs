const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController.cjs');

// Sin authMiddleware
router.post('/', chatbotController.handleChat);

module.exports = router;