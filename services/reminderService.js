const cron = require('node-cron');
const { Reservation, Table } = require('../models');
const { sendEmailNotification } = require('./emailService');
const smsService = require('./smsService');

// Хранилище ID броней, по которым уже отправлено напоминание (чтобы не дублировать)
const remindedSet = new Set();

async function sendReminders() {
  const now = new Date();
  // Интервал: от 55 до 65 минут от текущего момента
  const lowerBound = new Date(now.getTime() + 55 * 60000);
  const upperBound = new Date(now.getTime() + 65 * 60000);

  const reservations = await Reservation.findAll({
    where: { status: 'confirmed' },
    include: Table
  });

  for (const res of reservations) {
    const bookingDateTime = new Date(`${res.date}T${res.time}`);
    if (bookingDateTime >= lowerBound && bookingDateTime <= upperBound) {
      if (!remindedSet.has(res.id)) {
        remindedSet.add(res.id);
        // Отправляем email
        await sendEmailNotification({
          to: res.customerEmail,
          subject: 'Напоминание о бронировании в TableAlert',
          html: `<p>Уважаемый(ая) ${res.customerName},</p>
                 <p>Напоминаем, что через час у вас забронирован столик №${res.Table.number} на ${res.date} в ${res.time}.</p>
                 <p>Ждём вас в нашем бистро!</p>`,
        });
        // Отправляем SMS
        await smsService.sendSms({
          to: res.customerPhone,
          message: `TableAlert: напоминание, столик №${res.Table.number} на ${res.date} ${res.time} через час. Ждём вас!`
        });
        console.log(`Напоминание отправлено для брони ${res.id}`);
      }
    } else {
      // Если время вышло за пределы (например, бронь уже прошла), можно удалить из Set
      if (remindedSet.has(res.id)) {
        remindedSet.delete(res.id);
      }
    }
  }
}

// Запускаем проверку каждую минуту
cron.schedule('* * * * *', () => {
  console.log('🕒 Проверка напоминаний о бронях...');
  sendReminders().catch(console.error);
});