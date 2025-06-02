import moment from "moment";
moment.locale("id");

import geminiResponse from "../gemini.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan!",
      });
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server!",
    });
  }
};

export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;
    let assistantImage;

    if (req.file) {
      assistantImage = await uploadOnCloudinary(req.file.path);
    } else {
      assistantImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { assistantName, assistantImage },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan!",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server!",
    });
  }
};

export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;
    console.log("Perintah diterima:", command);

    const user = await User.findById(req.userId).select("-password");
    user.history.push(command);
    await user.save();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan!",
      });
    }

    const userName = user.name;
    const assistantName = user.assistantName;
    console.log(`Memproses perintah untuk ${assistantName} oleh ${userName}`);

    const result = await geminiResponse(command, assistantName, userName);

    if (!result) {
      console.error("Tidak ada respons dari Gemini");
      return res.status(500).json({
        type: "general",
        userInput: command,
        response: "Maaf, saya tidak dapat memproses permintaan Anda saat ini.",
      });
    }

    console.log("Raw result dari Gemini:", result);

    // Coba parse JSON dari respons
    let aiResult;
    try {
      const jsonMatch = result.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        console.error("Tidak ada JSON ditemukan dalam respons");
        return res.status(500).json({
          type: "general",
          userInput: command,
          response: "Maaf, saya tidak dapat memahami permintaan Anda.",
        });
      }

      aiResult = JSON.parse(jsonMatch[0]);
      console.log("Parsed AI result:", aiResult);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      return res.status(500).json({
        type: "general",
        userInput: command,
        response: "Maaf, terjadi kesalahan dalam memproses respons.",
      });
    }

    const type = aiResult.type;

    switch (type) {
      case "get-date":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Tanggal hari ini ${moment().format("DD MMMM YYYY")}`,
        });
      case "get-time":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Waktu sekarang ${moment().format("HH:mm:ss")}`,
        });
      case "get-day":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Hari ini adalah ${moment().format("dddd")}`,
        });
      case "get-month":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Bulan sekarang ${moment().format("MMMM")}`,
        });
      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
      case "weather-show":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: aiResult.response,
        });

      default:
        return res.status(400).json({
          response: "Maaf, perintah tidak dipahami!",
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      response: "Pertanyaan tidak dapat dijawab!",
    });
  }
};
