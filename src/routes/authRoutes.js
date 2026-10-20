const r=require('express').Router();const c=require('../controllers/authController');const {authenticate}=require('../middleware/auth');
r.post('/register',c.register);r.post('/login',c.login);r.get('/me',authenticate,c.me);r.patch('/change-password',authenticate,c.changePassword);r.post('/logout',authenticate,c.logout);module.exports=r;
