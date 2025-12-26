const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

router.get('/', cardController.getAllCards);
router.get('/code/:code', cardController.getCardByCode);
router.get('/user/:phone', cardController.getCardsByUserPhone);
router.post('/', cardController.createCard);
router.post('/redeem', cardController.redeemCard);

module.exports = router;



