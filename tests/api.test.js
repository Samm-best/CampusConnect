
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

let mongo, app, User, Complaint;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-123456789';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  app = require('../src/app');
  User = require('../src/models/User');
  Complaint = require('../src/models/Complaint');
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Complaint.deleteMany({}),
    mongoose.connection.collection('announcements').deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function makeUser(role = 'student', status = 'active') {
  return User.create({
    name: `Test ${role}`,
    email: `${role}${Math.random()}@example.com`,
    password: 'Password123!',
    role,
    status
  });
}

function token(user, extra = {}) {
  return jwt.sign(
    { sub: user.id, role: user.role, ...extra },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const auth = t => ({ Authorization: `Bearer ${t}` });

test(
  'public registration always creates student and never leaks password',
  async () => {
    const r = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student A',
        email: 'a@example.com',
        password: 'Password123!',
        role: 'admin'
      });

    expect(r.status).toBe(201);
    expect(r.body.data.user.role).toBe('student');
    expect(r.body.data.user.password).toBeUndefined();
    expect(r.body.data.token).toBeTruthy();
  }
);

test('duplicate emails are rejected', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Student A',
      email: 'a@example.com',
      password: 'Password123!'
    });

  const r = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Student B',
      email: 'a@example.com',
      password: 'Password123!'
    });

  expect([409, 400]).toContain(r.status);
});

test('rejects missing, malformed and expired JWTs', async () => {
  expect((await request(app).get('/api/auth/me')).status).toBe(401);

  expect(
    (
      await request(app)
        .get('/api/auth/me')
        .set(auth('not-a-token'))
    ).status
  ).toBe(401);

  const u = await makeUser();

  const expired = jwt.sign(
    { sub: u.id, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' }
  );

  expect(
    (
      await request(app)
        .get('/api/auth/me')
        .set(auth(expired))
    ).status
  ).toBe(401);
});

test('suspended user is blocked even with an old valid token', async () => {
  const u = await makeUser('student', 'suspended');

  expect(
    (
      await request(app)
        .get('/api/auth/me')
        .set(auth(token(u)))
    ).status
  ).toBe(403);
});

test('student cannot access another student complaint by ID', async () => {
  const a = await makeUser();
  const b = await makeUser();

  const c = await Complaint.create({
    title: 'Private issue',
    description: 'This complaint belongs to student B.',
    category: 'Academic',
    submittedBy: b.id
  });

  const r = await request(app)
    .get(`/api/complaints/${c.id}`)
    .set(auth(token(a)));

  expect(r.status).toBe(404);
});

test(
  'students cannot access admin routes and support cannot access dashboard',
  async () => {
    const s = await makeUser('student');
    const support = await makeUser('support');

    expect(
      (
        await request(app)
          .get('/api/users')
          .set(auth(token(s)))
      ).status
    ).toBe(403);

    expect(
      (
        await request(app)
          .get('/api/admin/dashboard')
          .set(auth(token(support)))
      ).status
    ).toBe(403);
  }
);

test('invalid IDs and invalid complaint inputs return 400', async () => {
  const s = await makeUser();

  expect(
    (
      await request(app)
        .get('/api/complaints/not-an-id')
        .set(auth(token(s)))
    ).status
  ).toBe(400);

  expect(
    (
      await request(app)
        .post('/api/complaints')
        .set(auth(token(s)))
        .send({ title: 'x' })
    ).status
  ).toBe(400);
});

test('students cannot mark complaint resolved', async () => {
  const s = await makeUser();

  const c = await Complaint.create({
    title: 'WiFi issue',
    description: 'Campus WiFi has not worked for two days.',
    category: 'Technical',
    submittedBy: s.id
  });

  const r = await request(app)
    .patch(`/api/complaints/${c.id}/status`)
    .set(auth(token(s)))
    .send({ status: 'Resolved' });

  expect(r.status).toBe(403);
});

test('profile updates cannot change role or status', async () => {
  const s = await makeUser();

  const r = await request(app)
    .patch('/api/users/me')
    .set(auth(token(s)))
    .send({
      name: 'Updated Name',
      role: 'admin',
      status: 'active'
    });

  expect(r.status).toBe(200);
  expect(r.body.data.user.role).toBe('student');
});
