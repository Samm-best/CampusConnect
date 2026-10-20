# CampusConnect design notes

## Schemas and relationships
- **User**: stores name, unique normalized email, bcrypt password hash, role (`student`, `admin`, `support`), status (`active`, `suspended`), and optional department/student ID. The password field is `select: false` and the JSON transform removes it.
- **Announcement**: stores title, body, category, and `createdBy` as a reference to User. Only admins write; authenticated users read.
- **Complaint**: stores title, description, category, priority, status, `submittedBy` and optional `assignedTo` User references, plus embedded responses. Each response stores sender reference, message, and timestamp.

## Middleware
1. `authenticate` extracts a Bearer JWT, verifies signature and expiry, reloads the account from MongoDB, checks suspension, and uses the current database role rather than trusting a stale role claim.
2. `authorize(...roles)` enforces role permissions at route level.
3. `validate` is reusable Joi middleware; controllers also validate request payloads with Joi schemas.
4. `notFound` and `errorHandler` centralize 404/error responses and avoid stack traces in production.
5. Helmet, JSON body-size limits, CORS, and rate limiting on authentication routes provide baseline hardening.

## Security choices
- Registration hardcodes `role: 'student'`; request-supplied role is ignored.
- User profile updates whitelist name, department, and student ID only.
- Students can read only their own complaints; unauthorized access returns 404 to avoid confirming another student's record exists.
- Suspended accounts are checked against MongoDB on every authenticated request, so a previously issued JWT is blocked.
- Access JWTs are stateless. `/logout` instructs the client to delete its token, but a copied token remains valid until expiry. For immediate server-side revocation, add a token-version or denylist mechanism; short expiry is used as the baseline.
- Admin creation is via the trusted `npm run seed:admin` command and environment variables, not public registration.

## Complaint permissions
- Students create complaints, list their own, read their own, and add responses. They cannot set `Resolved` or `Closed`.
- Admins and support officers can list all complaints and manage status.
- Only admins can assign a complaint, and assignees must be active admin/support users.
