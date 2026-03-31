// services/smsService.js
// Эмуляция отправки SMS. В реальном проекте замените на вызов API провайдера.

exports.sendSms = async ({ to, message }) => {
  console.log(`[SMS to ${to}]: ${message}`);
  // Для демо считаем, что SMS отправлено успешно
  return true;
};