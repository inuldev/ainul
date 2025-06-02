import axios from "axios";
import { assistantLogger } from "./middleware/logger.js";

// Enhanced Gemini response with retry mechanism and better error handling
const geminiResponse = async (
  command,
  assistantName,
  userName,
  retryCount = 0
) => {
  const maxRetries = 3;
  const retryDelay = 1000 * (retryCount + 1); // Progressive delay
  const startTime = Date.now();

  try {
    const apiUrl = process.env.GEMINI_API_URL;

    if (!apiUrl) {
      console.error("GEMINI_API_URL tidak ditemukan di environment variables");
      return {
        error: true,
        message: "Konfigurasi API tidak ditemukan",
        fallback: {
          type: "general",
          userInput: command,
          response: "Maaf, terjadi masalah konfigurasi sistem.",
        },
      };
    }

    console.log(
      `[Attempt ${retryCount + 1}] Mengirim perintah ke Gemini:`,
      command
    );

    // Enhanced prompt with better structure and examples
    const prompt = `Kamu adalah asisten virtual bernama ${assistantName} yang dibuat oleh ${userName}.

PENTING: Respons HARUS berupa JSON yang valid dengan format PERSIS seperti ini:
{
  "type": "tipe_perintah",
  "userInput": "input_bersih",
  "response": "respons_suara"
}

TIPE YANG TERSEDIA:
- "general": Pertanyaan umum, obrolan, atau informasi yang kamu ketahui
- "google-search": Mencari informasi di Google
- "youtube-search": Mencari video di YouTube
- "youtube-play": Memutar lagu/video tertentu di YouTube
- "get-time": Menanyakan waktu saat ini
- "get-date": Menanyakan tanggal hari ini
- "get-day": Menanyakan hari apa sekarang
- "get-month": Menanyakan bulan apa sekarang
- "calculator-open": Membuka kalkulator
- "instagram-open": Membuka Instagram
- "facebook-open": Membuka Facebook
- "weather-show": Menanyakan cuaca

ATURAN userInput:
- Hapus nama asisten dari input
- Untuk pencarian: hanya kata kunci pencarian
- Untuk perintah lain: input asli yang sudah dibersihkan

ATURAN response:
- Bahasa Indonesia yang natural
- Singkat dan jelas untuk dibacakan
- Sesuai dengan konteks perintah

CONTOH:
Input: "${assistantName} cari video kucing lucu"
Output: {"type":"youtube-search","userInput":"kucing lucu","response":"Baik, saya akan mencari video kucing lucu di YouTube"}

Input: "${assistantName} jam berapa sekarang"
Output: {"type":"get-time","userInput":"jam berapa sekarang","response":"Baik, saya akan memberitahu waktu saat ini"}

Input pengguna: ${command}

RESPONS JSON:`;

    // Configure axios with timeout and better error handling
    const axiosConfig = {
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    };

    const result = await axios.post(
      apiUrl,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Lower temperature for more consistent responses
          maxOutputTokens: 1024,
        },
      },
      axiosConfig
    );

    const responseText = result.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Respons kosong dari Gemini API");
    }

    const duration = Date.now() - startTime;
    assistantLogger.logGeminiCall(command, true, duration, retryCount);
    console.log("Raw Gemini response:", responseText);
    return responseText;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Attempt ${retryCount + 1}] Error di geminiResponse:`,
      error.message
    );

    // Log detailed error information
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(
        `Retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return geminiResponse(command, assistantName, userName, retryCount + 1);
    }

    // Log final failure
    assistantLogger.logGeminiCall(command, false, duration, retryCount);

    // Return structured error with fallback
    return {
      error: true,
      message: error.message,
      fallback: generateFallbackResponse(command),
    };
  }
};

// Fallback response generator for when Gemini fails
const generateFallbackResponse = (command) => {
  const lowerCommand = command.toLowerCase();

  // Simple pattern matching for common commands
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

  if (lowerCommand.includes("cari") && lowerCommand.includes("google")) {
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

  // Default fallback
  return {
    type: "general",
    userInput: command,
    response:
      "Maaf, saya tidak dapat memproses permintaan Anda saat ini. Silakan coba lagi.",
  };
};

export default geminiResponse;
