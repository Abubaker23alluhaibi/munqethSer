const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');

router.get('/', driverController.getAllDrivers);
router.get('/available', driverController.getAvailableDrivers);
router.get('/nearest', driverController.findNearestDriver);
router.get('/:id', driverController.getDriverById);
router.post('/', driverController.addDriver);
router.put('/:id', driverController.updateDriver);
router.delete('/:id', driverController.deleteDriver);
router.put('/:id/location', driverController.updateDriverLocation);
router.put('/:id/fcm-token', driverController.updateFcmToken);
router.put('/driverId/:driverId/fcm-token', driverController.updateFcmTokenByDriverId);
// Note: /me/location endpoint requires authentication middleware to get driverId from token

module.exports = router;

