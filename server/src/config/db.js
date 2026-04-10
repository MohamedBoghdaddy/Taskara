const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const collections = mongoose.connection.db ? await mongoose.connection.db.listCollections().toArray() : [];
    // Indexes are defined in models
    console.log('Database indexes ready');
  } catch (err) {
    console.warn('Index creation warning:', err.message);
  }
};

module.exports = { connectDB };
