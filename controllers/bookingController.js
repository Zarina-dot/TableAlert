const { Table, Reservation } = require('../models');
const { sendEmailNotification } = require('../services/emailService');
const smsService = require('../services/smsService');
const { broadcastUpdate } = require('../socket');

// Получить все столики
exports.getTables = async (req, res) => {
  try {
    const tables = await Table.findAll();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Проверить доступность столика на конкретное время
exports.checkAvailability = async (req, res) => {
  const { tableId, date, time, guestsCount } = req.query;
  try {
    const table = await Table.findByPk(tableId);
    if (!table) return res.status(404).json({ error: 'Столик не найден' });
    if (table.capacity < guestsCount) {
      return res.json({ available: false, reason: 'Недостаточно мест' });
    }

    const existing = await Reservation.findOne({
      where: {
        tableId,
        date,
        time,
        status: 'confirmed',
      },
    });
    res.json({ available: !existing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Создать новую бронь
exports.createReservation = async (req, res) => {
  const { tableId, customerName, customerPhone, date, time, guestsCount } = req.body;

  try {
    const table = await Table.findByPk(tableId);
    if (!table) return res.status(404).json({ error: 'Столик не найден' });

    // Определяем email: если пользователь авторизован, берём из сессии
    let email;
    if (req.session.userEmail) {
      email = req.session.userEmail;
    } else {
      email = req.body.customerEmail;
      if (!email) {
        return res.status(400).json({ error: 'Для неавторизованных пользователей email обязателен' });
      }
    }

    // Проверка даты и времени
    const bookingDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    if (bookingDateTime < now) {
      return res.status(400).json({ error: 'Нельзя забронировать на прошедшую дату или время.' });
    }
    const minAllowedTime = new Date(now.getTime() + 30 * 60000);
    if (bookingDateTime < minAllowedTime) {
      return res.status(400).json({ error: 'Бронирование доступно минимум за 30 минут.' });
    }

    if (table.capacity < guestsCount) {
      return res.status(400).json({ error: 'Столик не вмещает указанное количество гостей' });
    }

    const existing = await Reservation.findOne({
      where: { tableId, date, time, status: 'confirmed' },
    });
    if (existing) {
      return res.status(409).json({ error: 'Это время уже занято' });
    }

    const reservation = await Reservation.create({
      tableId,
      customerName,
      customerEmail: email,
      customerPhone,
      date,
      time,
      guestsCount,
    });

    // Отправляем email
    await sendEmailNotification({
      to: email,
      subject: 'Подтверждение бронирования столика',
      html: `<p>Уважаемый(ая) ${customerName},</p>
             <p>Ваш столик №${table.number} на ${date} в ${time} успешно забронирован.</p>
             <p>Спасибо, что выбрали наше кафе!</p>`,
    });

    // Отправляем SMS
    await smsService.sendSms({
      to: customerPhone,
      message: `TableAlert: столик №${table.number} забронирован на ${date} в ${time}. Ждём вас!`
    });

    broadcastUpdate('new_reservation', reservation);

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Отменить бронь (с уведомлением)
exports.cancelReservation = async (req, res) => {
  const { id } = req.params;
  try {
    const reservation = await Reservation.findByPk(id, { include: Table });
    if (!reservation) return res.status(404).json({ error: 'Бронь не найдена' });

    reservation.status = 'cancelled';
    await reservation.save();

    // Уведомляем клиента об отмене
    await sendEmailNotification({
      to: reservation.customerEmail,
      subject: 'Отмена бронирования',
      html: `<p>Уважаемый(ая) ${reservation.customerName},</p>
             <p>Ваше бронирование столика №${reservation.Table.number} на ${reservation.date} в ${reservation.time} было отменено.</p>`,
    });

    // Можно также отправить SMS об отмене
    await smsService.sendSms({
      to: reservation.customerPhone,
      message: `TableAlert: бронь столика №${reservation.Table.number} на ${reservation.date} ${reservation.time} отменена.`
    });

    broadcastUpdate('cancel_reservation', reservation);

    res.json({ message: 'Бронь отменена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить все брони (для администратора)
exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({ include: Table });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить брони текущего пользователя (по email из сессии)
exports.getMyReservations = async (req, res) => {
  try {
    const userEmail = req.session.userEmail;
    if (!userEmail) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const reservations = await Reservation.findAll({
      where: { customerEmail: userEmail },
      include: Table,
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Проверить доступность всех столов на указанные дату и время
exports.checkAllTablesAvailability = async (req, res) => {
  const { date, time } = req.query;
  if (!date || !time) {
    return res.status(400).json({ error: 'Не указаны дата и время' });
  }
  try {
    const tables = await Table.findAll();
    const availabilityMap = {};
    for (const table of tables) {
      const existing = await Reservation.findOne({
        where: {
          tableId: table.id,
          date,
          time,
          status: 'confirmed'
        }
      });
      availabilityMap[table.id] = !existing;
    }
    res.json(availabilityMap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};