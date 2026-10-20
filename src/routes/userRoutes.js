
const r = require('express').Router();

const c = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

r.use(authenticate);

r.get(
  '/me',
  (req, res, next) => {
    req.params.id = req.user.id;
    next();
  },
  c.getById
);

r.patch('/me', c.updateMe);

r.get('/', authorize('admin'), c.list);
r.get('/:id', c.getById);

r.patch('/:id/role', authorize('admin'), c.changeRole);
r.patch('/:id/status', authorize('admin'), c.changeStatus);

module.exports = r;
