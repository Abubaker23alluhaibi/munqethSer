const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/', adminController.getAllAdmins);
router.get('/exists/:id', adminController.adminExists);
router.get('/code/:code', adminController.getAdminByCode);
router.get('/:id', adminController.getAdminById);
router.post('/login', adminController.loginAdmin);
router.post('/', adminController.addAdmin);
router.put('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;






