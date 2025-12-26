const express = require('express');
const router = express.Router();
const mapsController = require('../controllers/mapsController');

router.get('/status', mapsController.getStatus);
router.get('/directions', mapsController.getDirections);
router.get('/geocode', mapsController.geocodeAddress);
router.get('/reverse-geocode', mapsController.reverseGeocode);

module.exports = router;






