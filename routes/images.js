const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

router.post('/upload', imageController.upload.single('image'), imageController.uploadImage);
router.post('/upload-multiple', imageController.upload.array('images', 10), imageController.uploadMultipleImages);
router.delete('/:publicId', imageController.deleteImage);
router.get('/optimize', imageController.getImageUrl);

module.exports = router;







