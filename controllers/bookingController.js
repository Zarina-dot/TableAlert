// controllers/bookingController.js
const { Op } = require('sequelize');
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

// Проверить доступность столика на конкретное время (один столик)
exports.checkAvailability = async (req, res) => {
  const { tableId, date, time, guestsCount } = req.query;
  try {
    const table = await Table.findByPk(tableId);
    if (!table) return res.status(404).json({ error: 'Столик не найден' });
    if (table.capacity < guestsCount) {
      return res.json({ available: false, reason: 'Недостаточно мест' });
    }
    const existing = await Reservation.findOne({
      where: { tableId, date, time, status: 'confirmed' },
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

    // Email: из сессии или из запроса
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

    // Проверка точного совпадения времени
    const existing = await Reservation.findOne({
      where: { tableId, date, time, status: 'confirmed' },
    });
    if (existing) {
      return res.status(409).json({ error: 'Это время уже занято' });
    }

    // Проверка: есть ли бронь на этот стол, которая началась менее 1 часа назад (или начинается в ближайший час)
    const oneHourBefore = new Date(bookingDateTime.getTime() - 60 * 60000);
    const oneHourBeforeTime = oneHourBefore.toTimeString().slice(0, 8);
    const recentReservation = await Reservation.findOne({
      where: {
        tableId,
        date,
        time: {
          [Op.between]: [oneHourBeforeTime, time]
        },
        status: 'confirmed'
      }
    });
    if (recentReservation) {
      return res.status(409).json({ error: 'Этот столик уже забронирован на ближайший час. Выберите другое время.' });
    }

    // Создание брони
    const reservation = await Reservation.create({
      tableId,
      customerName,
      customerEmail: email,
      customerPhone,
      date,
      time,
      guestsCount,
    });

    // Отправляем уведомления асинхронно (не блокируем ответ)
    sendEmailNotification({
      to: email,
      subject: 'Подтверждение бронирования столика',
      html: `<p>Уважаемый(ая) ${customerName},</p>
             <p>Ваш столик №${table.number} на ${date} в ${time} успешно забронирован.</p>
             <p>Спасибо, что выбрали наше кафе!</p>`,
    }).catch(console.error);

    smsService.sendSms({
      to: customerPhone,
      message: `TableAlert: столик №${table.number} забронирован на ${date} в ${time}. Ждём вас!`
    }).catch(console.error);

    broadcastUpdate('new_reservation', reservation);

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Ошибка при создании брони:', error);
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

    // Уведомления асинхронно
    sendEmailNotification({
      to: reservation.customerEmail,
      subject: 'Отмена бронирования',
      html: `<p>Уважаемый(ая) ${reservation.customerName},</p>
             <p>Ваше бронирование столика №${reservation.Table.number} на ${reservation.date} в ${reservation.time} было отменено.</p>`,
    }).catch(console.error);

    smsService.sendSms({
      to: reservation.customerPhone,
      message: `TableAlert: бронь столика №${reservation.Table.number} на ${reservation.date} ${reservation.time} отменена.`
    }).catch(console.error);

    broadcastUpdate('cancel_reservation', reservation);

    res.json({ message: 'Бронь отменена' });
  } catch (error) {
    console.error('Ошибка при отмене брони:', error);
    res.status(500).json({ error: error.message });
  }
};

// Получить все брони (только для администратора)
exports.getAllReservations = async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Доступ запрещён. Только для администратора.' });
  }
  try {
    const reservations = await Reservation.findAll({
      include: Table,
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
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

// Проверить доступность всех столов на выбранные дату и время (для интерактивной схемы)
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