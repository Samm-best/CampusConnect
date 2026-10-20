
const r = require('express').Router();

const c = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

r.get('/dashboard', authenticate, authorize('admin'), c.dashboard);

module.exports = r;
