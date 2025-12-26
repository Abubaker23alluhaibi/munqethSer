const express = require('express');
const router = express.Router();
const advertisementController = require('../controllers/advertisementController');

router.get('/', advertisementController.getAllAdvertisements);
router.get('/:id', advertisementController.getAdvertisementById);
router.post('/', advertisementController.createAdvertisement);
router.put('/:id', advertisementController.updateAdvertisement);
router.delete('/:id', advertisementController.deleteAdvertisement);

module.exports = router;







