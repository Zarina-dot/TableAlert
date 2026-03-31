const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-code', authController.sendCode);
router.post('/verify-code', authController.verifyCode);
router.get('/me', authController.me);
router.post('/logout', authController.logout);

module.exports = router;