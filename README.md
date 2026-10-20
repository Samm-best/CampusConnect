# CampusConnect — Student and Campus Management REST API

A secure REST API built with Node.js, Express, MongoDB, and Mongoose for student accounts, campus announcements, and complaint handling.

## Requirements
- Node.js 18+
- MongoDB local instance or MongoDB Atlas database
- npm

## Install and configure
```bash
npm install
cp .env.example .env
```
Edit `.env`. Set `MONGO_URI`, `JWT_SECRET` (use a long random secret), `JWT_EXPIRES_IN`, and optionally the admin seed fields. Never commit `.env` or real secrets.

### MongoDB Atlas authentication troubleshooting
If startup reports `bad auth : Authentication failed`, check that the **database user** username/password in Atlas are correct (not your Atlas website login), reset the database user's password if needed, URL-encode special characters in the password (for example `@` becomes `%40`), confirm the correct cluster hostname and database user permissions, and ensure your current IP is allowed in Atlas Network Access. Keep the URI only in `.env`; do not paste credentials into source code or commit them.

Example URI shape (replace placeholders):
```
MONGO_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@cluster.example.mongodb.net/campusconnect?retryWrites=true&w=majority
```

## Run
```bash
npm run dev
# or
npm start
```
Health check: `GET http://localhost:5000/api/health`.

Create the first administrator securely from your local trusted environment:
```bash
# Configure ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env
npm run seed:admin
```
Do not expose admin seed credentials or commit them. Public registration always creates a student.

## Test
```bash
npm test
```
The Jest/Supertest suite uses `mongodb-memory-server` and exercises registration privilege escalation, duplicate email, missing/malformed/expired tokens, suspended accounts, complaint ownership, role restrictions, invalid IDs/input, and password/role leakage. First-time `mongodb-memory-server` use may need to download a MongoDB test binary; if network access blocks that, configure a local MongoDB test URI or run tests in an environment where the binary is available.

## API documentation
See `docs/CampusConnect.postman_collection.json` for a starter Postman collection and `docs/DESIGN.md` for schema relationships, middleware, permissions, and the logout strategy.

## Main routes
| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register student |
| POST | `/api/auth/login` | Public | Login and get JWT |
| GET | `/api/auth/me` | Authenticated | Current account |
| PATCH | `/api/auth/change-password` | Authenticated | Change password |
| POST | `/api/auth/logout` | Authenticated | Client logout guidance |
| GET/PATCH | `/api/users/me` | Authenticated | Read/update own profile |
| GET | `/api/users` | Admin | Paginated user search |
| GET | `/api/users/:id` | Authenticated, ownership enforced | Read user |
| PATCH | `/api/users/:id/role` | Admin | Change role |
| PATCH | `/api/users/:id/status` | Admin | Suspend/reactivate |
| POST/GET | `/api/announcements` | Admin writes; authenticated reads | Announcement CRUD |
| GET | `/api/announcements/:id` | Authenticated | Read announcement |
| PATCH/DELETE | `/api/announcements/:id` | Admin | Update/delete announcement |
| POST | `/api/complaints` | Student | Submit complaint |
| GET | `/api/complaints/my` | Student | List own complaints |
| GET | `/api/complaints` | Admin/support | List all complaints |
| GET | `/api/complaints/:id` | Authenticated, ownership enforced | Read complaint |
| PATCH | `/api/complaints/:id/status` | Authenticated with role rules | Update status |
| PATCH | `/api/complaints/:id/assign` | Admin | Assign support/admin |
| POST | `/api/complaints/:id/responses` | Authenticated, ownership enforced | Add response |
| GET | `/api/admin/dashboard` | Admin | Live database counts |

## Authorization conventions
Send `Authorization: Bearer YOUR_JWT` for protected endpoints. Roles are `student`, `admin`, and `support`. Responses use a consistent `{ "success": true, "data": ... }` shape. Errors return a status code and message; production errors do not expose stack traces.

## Git workflow
```bash
git init
git add .
git commit -m "Build CampusConnect API foundation"
# After each module:
git add . && git commit -m "Add complaint authorization and tests"
```
Review `.gitignore` before pushing. Never push `.env`.
