const express = require('express');
const router = express.Router();
const supermarketController = require('../controllers/supermarketController');

router.get('/', supermarketController.getAllSupermarkets);
router.get('/nearest', supermarketController.findNearestSupermarket);
router.get('/:id', supermarketController.getSupermarketById);
router.post('/', supermarketController.addSupermarket);
router.put('/:id', supermarketController.updateSupermarket);
router.delete('/:id', supermarketController.deleteSupermarket);
// Location management endpoints
router.post('/:id/locations', supermarketController.addLocation);
router.put('/:id/locations/:locationId', supermarketController.updateLocation);
router.delete('/:id/locations/:locationId', supermarketController.deleteLocation);

module.exports = router;







