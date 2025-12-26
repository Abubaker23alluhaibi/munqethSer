const express = require('express');
const router = express.Router();
const supermarketController = require('../controllers/supermarketController');

router.get('/', supermarketController.getAllSupermarkets);
router.get('/nearest', supermarketController.findNearestSupermarket);
router.get('/:id', supermarketController.getSupermarketById);
router.post('/', supermarketController.addSupermarket);
router.put('/:id', supermarketController.updateSupermarket);
router.delete('/:id', supermarketController.deleteSupermarket);

module.exports = router;







