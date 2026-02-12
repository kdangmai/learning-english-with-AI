const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings for optimal concurrent query performance
      maxPoolSize: 10,          // Max 10 simultaneous connections
      minPoolSize: 2,           // Keep 2 connections ready
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is down
      socketTimeoutMS: 30000,   // 30s query timeout
      heartbeatFrequencyMS: 10000,   // Health check interval
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
