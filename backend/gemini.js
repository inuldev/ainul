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

    // Get current context for better responses
    const currentTime = new Date();
    const timeContext = {
      time: currentTime.toLocaleTimeString("id-ID"),
      date: currentTime.toLocaleDateString("id-ID"),
      day: currentTime.toLocaleDateString("id-ID", { weekday: "long" }),
      month: currentTime.toLocaleDateString("id-ID", { month: "long" }),
    };

    // Enhanced intelligent prompt system
    const prompt = `Kamu adalah ${assistantName}, asisten virtual cerdas milik ${userName}.

KONTEKS SAAT INI:
- Waktu: ${timeContext.time}
- Tanggal: ${timeContext.date}
- Hari: ${timeContext.day}
- Bulan: ${timeContext.month}

KEPRIBADIAN & KEMAMPUAN:
- Ramah, helpful, dan cerdas
- Dapat memahami konteks dan nuansa percakapan
- Mampu memberikan jawaban yang informatif dan relevan
- Dapat melakukan reasoning dan analisis
- Responsif terhadap emosi dan kebutuhan user

INSTRUKSI UTAMA:
1. PAHAMI konteks dan maksud user dengan baik
2. BERIKAN respons yang natural dan helpful
3. GUNAKAN pengetahuan umum untuk menjawab pertanyaan
4. IDENTIFIKASI tipe perintah yang tepat
5. FORMAT respons dalam JSON yang valid

FORMAT RESPONS JSON:
{
  "type": "tipe_perintah",
  "userInput": "input_yang_dibersihkan",
  "response": "respons_natural_dalam_bahasa_indonesia"
}

TIPE PERINTAH YANG TERSEDIA:
- "general": Pertanyaan umum, obrolan, pengetahuan, matematika sederhana, fakta, saran, dll
- "google-search": Mencari informasi spesifik di Google (gunakan jika butuh info terkini)
- "youtube-search": Mencari video/musik di YouTube
- "youtube-play": Memutar lagu/video tertentu
- "get-time": Menanyakan waktu (sudah tersedia: ${timeContext.time})
- "get-date": Menanyakan tanggal (sudah tersedia: ${timeContext.date})
- "get-day": Menanyakan hari (sudah tersedia: ${timeContext.day})
- "get-month": Menanyakan bulan (sudah tersedia: ${timeContext.month})
- "calculator-open": Membuka kalkulator untuk perhitungan kompleks
- "instagram-open": Membuka Instagram
- "facebook-open": Membuka Facebook
- "weather-show": Menanyakan cuaca

PANDUAN PEMILIHAN TIPE:
- Gunakan "general" untuk sebagian besar pertanyaan yang bisa dijawab langsung
- Gunakan "google-search" hanya jika butuh informasi terkini/spesifik
- Untuk waktu/tanggal, berikan info langsung dengan tipe yang sesuai
- Untuk perhitungan sederhana, jawab langsung dengan "general"

CONTOH RESPONS CERDAS:
Input: "Siapa presiden Indonesia?"
Output: {"type":"general","userInput":"siapa presiden indonesia","response":"Presiden Indonesia saat ini adalah Joko Widodo atau yang biasa dipanggil Jokowi. Beliau menjabat sejak tahun 2014."}

Input: "Berapa 15 kali 23?"
Output: {"type":"general","userInput":"15 kali 23","response":"15 dikali 23 sama dengan 345."}

Input: "Jam berapa sekarang?"
Output: {"type":"get-time","userInput":"jam berapa sekarang","response":"Sekarang jam ${timeContext.time}."}

Input: "Apa itu AI?"
Output: {"type":"general","userInput":"apa itu ai","response":"AI atau Artificial Intelligence adalah teknologi yang memungkinkan mesin untuk meniru kecerdasan manusia, seperti belajar, berpikir, dan memecahkan masalah."}

PERINTAH USER: "${command}"

Analisis perintah dengan cermat dan berikan respons JSON yang tepat:`;

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

// Enhanced intelligent fallback response generator
const generateFallbackResponse = (command) => {
  const lowerCommand = command.toLowerCase();
  const currentTime = new Date();

  // Time-related queries with actual time
  if (lowerCommand.includes("waktu") || lowerCommand.includes("jam")) {
    return {
      type: "get-time",
      userInput: command,
      response: `Sekarang jam ${currentTime.toLocaleTimeString("id-ID")}.`,
    };
  }

  if (lowerCommand.includes("tanggal")) {
    return {
      type: "get-date",
      userInput: command,
      response: `Hari ini tanggal ${currentTime.toLocaleDateString("id-ID")}.`,
    };
  }

  if (lowerCommand.includes("hari")) {
    const dayName = currentTime.toLocaleDateString("id-ID", {
      weekday: "long",
    });
    return {
      type: "get-day",
      userInput: command,
      response: `Hari ini adalah hari ${dayName}.`,
    };
  }

  // Math calculations
  const mathMatch = lowerCommand.match(/(\d+)\s*[\+\-\*\/x]\s*(\d+)/);
  if (mathMatch) {
    try {
      const result = eval(command.replace(/x/g, "*"));
      return {
        type: "general",
        userInput: command,
        response: `Hasil perhitungan ${command} adalah ${result}.`,
      };
    } catch (e) {
      return {
        type: "calculator-open",
        userInput: command,
        response: "Baik, saya akan membuka kalkulator untuk perhitungan ini.",
      };
    }
  }

  // Search queries
  if (lowerCommand.includes("cari") && lowerCommand.includes("google")) {
    const searchTerm = command
      .replace(/.*cari/i, "")
      .replace(/di google/i, "")
      .trim();
    return {
      type: "google-search",
      userInput: searchTerm || command,
      response: `Baik, saya akan mencari "${searchTerm}" di Google.`,
    };
  }

  if (
    lowerCommand.includes("youtube") ||
    lowerCommand.includes("video") ||
    lowerCommand.includes("musik")
  ) {
    const searchTerm = command
      .replace(/.*youtube/i, "")
      .replace(/.*video/i, "")
      .replace(/.*musik/i, "")
      .replace(/cari/i, "")
      .trim();
    return {
      type: "youtube-search",
      userInput: searchTerm || command,
      response: `Baik, saya akan mencari "${searchTerm}" di YouTube.`,
    };
  }

  // Weather
  if (lowerCommand.includes("cuaca")) {
    return {
      type: "weather-show",
      userInput: command,
      response: "Baik, saya akan menampilkan informasi cuaca untuk Anda.",
    };
  }

  // Greetings and common phrases
  if (
    lowerCommand.includes("halo") ||
    lowerCommand.includes("hai") ||
    lowerCommand.includes("hello")
  ) {
    return {
      type: "general",
      userInput: command,
      response: "Halo! Senang bertemu dengan Anda. Ada yang bisa saya bantu?",
    };
  }

  if (
    lowerCommand.includes("terima kasih") ||
    lowerCommand.includes("makasih")
  ) {
    return {
      type: "general",
      userInput: command,
      response: "Sama-sama! Senang bisa membantu Anda.",
    };
  }

  if (
    lowerCommand.includes("siapa kamu") ||
    lowerCommand.includes("siapa anda")
  ) {
    return {
      type: "general",
      userInput: command,
      response:
        "Saya adalah asisten virtual AI yang siap membantu Anda dengan berbagai pertanyaan dan tugas.",
    };
  }

  // Default intelligent fallback
  return {
    type: "general",
    userInput: command,
    response:
      "Maaf, saya belum sepenuhnya memahami permintaan Anda. Bisakah Anda menjelaskan dengan cara yang berbeda?",
  };
};

export default geminiResponse;
