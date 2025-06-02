import mongoose from "mongoose";

let isConnected = false;

const connectDb = async () => {
  // If already connected, return
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    // In serverless, we need to handle existing connections
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL, {
        bufferCommands: false, // Disable mongoose buffering
        maxPoolSize: 1, // Maintain up to 1 socket connection for serverless
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      });
    }

    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    isConnected = false;

    // Don't exit process in serverless environment
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDb;
