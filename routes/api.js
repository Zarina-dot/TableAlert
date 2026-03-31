const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get('/tables', bookingController.getTables);
router.get('/availability', bookingController.checkAvailability);
router.post('/reservations', bookingController.createReservation);
router.delete('/reservations/:id', bookingController.cancelReservation);
router.get('/reservations', bookingController.getAllReservations); // для админа
router.get('/reservations/my', bookingController.getMyReservations); // для пользователя
router.get('/tables/availability', bookingController.checkAllTablesAvailability);
module.exports = router;