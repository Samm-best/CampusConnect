
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(port, () =>
      console.log(`CampusConnect API listening on port ${port}`)
    );

    const shutdown = () => server.close(() => process.exit(0));

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch(err => {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });
