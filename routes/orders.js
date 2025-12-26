const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/', orderController.getOrders);
router.get('/nearest-driver', orderController.findNearestDriver);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id/status', orderController.updateOrderStatus);
router.post('/:id/accept', orderController.acceptOrderByDriver);

module.exports = router;







