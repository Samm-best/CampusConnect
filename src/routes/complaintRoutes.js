
const r = require('express').Router();

const c = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');

r.use(authenticate);

// Students can create complaints
r.post('/', authorize('student'), c.create);

// Students can view their own complaints
r.get('/my', authorize('student'), c.mine);

// Admin and support can view all complaints
r.get('/', authorize('admin', 'support'), c.list);

// View a specific complaint
r.get('/:id', c.get);

// Update complaint status
r.patch('/:id/status', c.status);

// Only admins can assign complaints
r.patch('/:id/assign', authorize('admin'), c.assign);

// Respond to a complaint
r.post('/:id/responses', c.respond);

module.exports = r;
