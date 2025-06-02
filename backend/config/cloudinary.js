import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const uploadOnCloudinary = async (fileInput) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    let uploadResult;

    // Handle both file path (local) and buffer (serverless)
    if (typeof fileInput === "string") {
      // Local development - file path
      uploadResult = await cloudinary.uploader.upload(fileInput);
      fs.unlinkSync(fileInput);
    } else {
      // Serverless - buffer from memory storage
      uploadResult = await cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) throw error;
          return result;
        }
      );

      // For buffer upload, we need to use upload_stream differently
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(fileInput);
      });
    }

    return uploadResult.secure_url;
  } catch (error) {
    if (typeof fileInput === "string") {
      try {
        fs.unlinkSync(fileInput);
      } catch (unlinkError) {
        // Ignore unlink errors in serverless
      }
    }
    return error.message;
  }
};

export default uploadOnCloudinary;
