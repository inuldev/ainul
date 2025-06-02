import multer from "multer";
import path from "path";

// Use memory storage for serverless environment
const storage =
  process.env.NODE_ENV === "production"
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, "./public");
        },
        filename: function (req, file, cb) {
          cb(null, Date.now() + path.extname(file.originalname));
        },
      });

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default upload;
