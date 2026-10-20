const mongoose = require('mongoose');
async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI is missing. Configure your .env file.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
module.exports = connectDB;
