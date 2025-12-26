const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

router.post('/update', locationController.updateLocation);
router.get('/current', locationController.getCurrentLocation);
router.get('/distance', locationController.calculateDistance);

module.exports = router;







