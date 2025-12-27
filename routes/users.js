const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getAllUsers);
router.get('/phone/:phone', userController.getUserByPhone);
router.post('/authenticate', userController.authenticateUser); // يجب أن يكون قبل router.post('/')
router.post('/', userController.addUser);
router.put('/:id', userController.updateUser);
router.put('/:id/fcm-token', userController.updateFcmToken);
router.put('/phone/:phone/fcm-token', userController.updateFcmTokenByPhone);
router.get('/phone/:phone/fcm-token/status', userController.checkFcmTokenStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;




