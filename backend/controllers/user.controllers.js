import moment from "moment";
moment.locale("id");

import geminiResponse from "../gemini.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import { assistantLogger } from "../middleware/logger.js";

// Enhanced JSON parsing with multiple strategies
const parseGeminiResponse = (rawResponse, originalCommand) => {
  // Strategy 1: Direct JSON parse if response is already JSON
  try {
    const parsed = JSON.parse(rawResponse);
    if (parsed.type && parsed.response) {
      return parsed;
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON from markdown code blocks
  const codeBlockMatch = rawResponse.match(
    /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
  );
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (parsed.type && parsed.response) {
        return parsed;
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Extract JSON from text using regex
  const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type && parsed.response) {
        return parsed;
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 4: Try to fix common JSON issues
  let cleanedResponse = rawResponse
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^\s*[\w\s]*?(\{)/g, "$1") // Remove text before first {
    .replace(/(\})\s*[\w\s]*?$/g, "$1") // Remove text after last }
    .trim();

  try {
    const parsed = JSON.parse(cleanedResponse);
    if (parsed.type && parsed.response) {
      return parsed;
    }
  } catch (e) {
    // Continue to fallback
  }

  // If all parsing strategies fail, throw error
  throw new Error(`Tidak dapat mem-parse respons JSON: ${rawResponse}`);
};

// Local fallback generator
const generateLocalFallback = (command) => {
  const lowerCommand = command.toLowerCase();

  if (lowerCommand.includes("waktu") || lowerCommand.includes("jam")) {
    return {
      type: "get-time",
      userInput: command,
      response: "Baik, saya akan memberitahu waktu saat ini",
    };
  }

  if (lowerCommand.includes("tanggal")) {
    return {
      type: "get-date",
      userInput: command,
      response: "Baik, saya akan memberitahu tanggal hari ini",
    };
  }

  if (lowerCommand.includes("hari")) {
    return {
      type: "get-day",
      userInput: command,
      response: "Baik, saya akan memberitahu hari apa sekarang",
    };
  }

  if (lowerCommand.includes("bulan")) {
    return {
      type: "get-month",
      userInput: command,
      response: "Baik, saya akan memberitahu bulan apa sekarang",
    };
  }

  if (
    lowerCommand.includes("cari") &&
    (lowerCommand.includes("google") || lowerCommand.includes("search"))
  ) {
    const searchTerm = command
      .replace(/.*cari/i, "")
      .replace(/di google/i, "")
      .trim();
    return {
      type: "google-search",
      userInput: searchTerm || command,
      response: "Baik, saya akan mencari di Google",
    };
  }

  if (lowerCommand.includes("youtube") || lowerCommand.includes("video")) {
    const searchTerm = command
      .replace(/.*youtube/i, "")
      .replace(/.*video/i, "")
      .trim();
    return {
      type: "youtube-search",
      userInput: searchTerm || command,
      response: "Baik, saya akan mencari di YouTube",
    };
  }

  if (lowerCommand.includes("cuaca")) {
    return {
      type: "weather-show",
      userInput: command,
      response: "Baik, saya akan menampilkan informasi cuaca",
    };
  }

  if (lowerCommand.includes("kalkulator") || lowerCommand.includes("hitung")) {
    return {
      type: "calculator-open",
      userInput: command,
      response: "Baik, saya akan membuka kalkulator",
    };
  }

  if (lowerCommand.includes("instagram")) {
    return {
      type: "instagram-open",
      userInput: command,
      response: "Baik, saya akan membuka Instagram",
    };
  }

  if (lowerCommand.includes("facebook")) {
    return {
      type: "facebook-open",
      userInput: command,
      response: "Baik, saya akan membuka Facebook",
    };
  }

  // Default fallback
  return {
    type: "general",
    userInput: command,
    response:
      "Maaf, saya tidak dapat memproses permintaan Anda saat ini. Silakan coba lagi.",
  };
};

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
  const startTime = Date.now();

  try {
    const { command } = req.body;

    // Input validation
    if (
      !command ||
      typeof command !== "string" ||
      command.trim().length === 0
    ) {
      assistantLogger.logError(
        req.userId,
        command || "",
        new Error("Invalid command input")
      );
      return res.status(400).json({
        success: false,
        message: "Perintah tidak valid!",
        type: "general",
        userInput: "",
        response: "Maaf, perintah yang Anda berikan tidak valid.",
      });
    }

    assistantLogger.logCommand(req.userId, command, { type: "processing" }, 0);

    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan!",
      });
    }

    // Add to history with timestamp and limit history size
    const historyEntry = {
      command: command.trim(),
      timestamp: new Date(),
    };

    user.history.push(historyEntry);

    // Keep only last 50 entries to prevent database bloat
    if (user.history.length > 50) {
      user.history = user.history.slice(-50);
    }

    await user.save();

    const userName = user.name;
    const assistantName = user.assistantName;
    console.log(`Memproses perintah untuk ${assistantName} oleh ${userName}`);

    const result = await geminiResponse(command, assistantName, userName);

    // Handle Gemini API errors with fallback
    if (!result) {
      console.error("Tidak ada respons dari Gemini");
      return res.status(500).json({
        type: "general",
        userInput: command,
        response: "Maaf, saya tidak dapat memproses permintaan Anda saat ini.",
      });
    }

    // Handle structured error response from Gemini
    if (result.error) {
      console.error("Gemini API error:", result.message);
      const fallback = result.fallback;
      return res.json({
        type: fallback.type,
        userInput: fallback.userInput,
        response: fallback.response,
        warning: "Menggunakan mode fallback",
      });
    }

    console.log("Raw result dari Gemini:", result);

    // Enhanced JSON parsing with multiple fallback strategies
    let aiResult;
    try {
      aiResult = parseGeminiResponse(result, command);
      console.log("Parsed AI result:", aiResult);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);

      // Use fallback response
      const fallbackResponse = generateLocalFallback(command);
      return res.json({
        type: fallbackResponse.type,
        userInput: fallbackResponse.userInput,
        response: fallbackResponse.response,
        warning: "Menggunakan parser fallback",
      });
    }

    const type = aiResult.type;

    // Validate aiResult structure
    if (!type || !aiResult.response) {
      console.error("Invalid aiResult structure:", aiResult);
      const fallbackResponse = generateLocalFallback(command);
      return res.json({
        type: fallbackResponse.type,
        userInput: fallbackResponse.userInput,
        response: fallbackResponse.response,
        warning: "Struktur respons tidak valid",
      });
    }

    switch (type) {
      case "get-date":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Tanggal hari ini ${moment().format("DD MMMM YYYY")}`,
          timestamp: moment().toISOString(),
        });

      case "get-time":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Waktu sekarang ${moment().format("HH:mm:ss")}`,
          timestamp: moment().toISOString(),
        });

      case "get-day":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Hari ini adalah ${moment().format("dddd")}`,
          timestamp: moment().toISOString(),
        });

      case "get-month":
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: `Bulan sekarang ${moment().format("MMMM")}`,
          timestamp: moment().toISOString(),
        });

      case "weather-show":
        try {
          // Enhanced weather response with real data attempt
          const weatherData = await getWeatherData();
          if (weatherData) {
            return res.json({
              type,
              userInput: aiResult.userInput,
              response: `Cuaca hari ini: ${weatherData.description}, suhu ${weatherData.temperature}°C`,
              weatherData: weatherData,
              timestamp: moment().toISOString(),
            });
          } else {
            // Fallback to basic response
            return res.json({
              type,
              userInput: aiResult.userInput,
              response:
                aiResult.response ||
                "Baik, saya akan menampilkan informasi cuaca",
              timestamp: moment().toISOString(),
            });
          }
        } catch (weatherError) {
          console.error("Weather API error:", weatherError);
          return res.json({
            type,
            userInput: aiResult.userInput,
            response:
              aiResult.response ||
              "Baik, saya akan menampilkan informasi cuaca",
            timestamp: moment().toISOString(),
          });
        }

      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
        const duration = Date.now() - startTime;
        assistantLogger.logCommand(req.userId, command, aiResult, duration);
        return res.json({
          type,
          userInput: aiResult.userInput,
          response: aiResult.response,
          timestamp: moment().toISOString(),
        });

      default:
        console.warn("Unknown command type:", type);
        const defaultDuration = Date.now() - startTime;
        assistantLogger.logCommand(
          req.userId,
          command,
          { type: "unknown" },
          defaultDuration
        );
        return res.json({
          type: "general",
          userInput: aiResult.userInput,
          response: "Maaf, perintah tidak dipahami! Silakan coba lagi.",
          timestamp: moment().toISOString(),
        });
    }
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    assistantLogger.logError(req.userId, req.body.command || "", error);

    // Enhanced error response
    return res.status(500).json({
      success: false,
      type: "general",
      userInput: req.body.command || "",
      response: "Maaf, terjadi kesalahan sistem. Silakan coba lagi.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: moment().toISOString(),
      duration: `${errorDuration}ms`,
    });
  }
};

// Weather data fetcher (placeholder for real weather API)
const getWeatherData = async () => {
  try {
    // This is a placeholder - you can integrate with real weather APIs like:
    // - OpenWeatherMap
    // - WeatherAPI
    // - AccuWeather

    // For now, return mock data
    return {
      temperature: Math.floor(Math.random() * 15) + 20, // 20-35°C
      description: ["Cerah", "Berawan", "Hujan Ringan", "Mendung"][
        Math.floor(Math.random() * 4)
      ],
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      location: "Jakarta",
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
};
