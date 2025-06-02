import axios from "axios";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState, useCallback } from "react";

import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";
import { userDataContext } from "../context/UserContext";

function Home() {
  const navigate = useNavigate();
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext);

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [testCommand, setTestCommand] = useState("");
  const [ham, setHam] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const isSpeakingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const recognitionRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const synth = window.speechSynthesis;

  // Enhanced network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setErrorMessage("");
      retryCountRef.current = 0;
    };

    const handleOffline = () => {
      setIsOnline(false);
      setErrorMessage("Koneksi internet terputus");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.log(error);
    }
  };

  // Enhanced speech recognition with debouncing
  const startRecognition = useCallback(() => {
    if (!isOnline) {
      setErrorMessage(
        "Tidak dapat memulai pengenalan suara tanpa koneksi internet"
      );
      return;
    }

    try {
      if (recognitionRef.current && !isRecognizingRef.current) {
        recognitionRef.current.start();
        setListening(true);
        setErrorMessage("");
      }
    } catch (error) {
      if (
        !error.message.includes("start") &&
        !error.message.includes("already")
      ) {
        console.error("Recognition error: ", error);
        setErrorMessage("Gagal memulai pengenalan suara");
      }
    }
  }, [isOnline]);

  // Enhanced speech synthesis with better error handling
  const speak = useCallback(
    (text, priority = false) => {
      if (!text) return;

      try {
        // Cancel any ongoing speech if priority
        if (priority) {
          synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // Try to use Indonesian voice
        const voices = window.speechSynthesis.getVoices();
        const indonesianVoice = voices.find(
          (v) => v.lang === "id-ID" || v.lang.startsWith("id")
        );

        if (indonesianVoice) {
          utterance.voice = indonesianVoice;
        }

        isSpeakingRef.current = true;

        utterance.onstart = () => {
          console.log("Speech started");
        };

        utterance.onend = () => {
          console.log("Speech ended");
          setAiText("");
          isSpeakingRef.current = false;

          // Resume listening after speech with delay
          setTimeout(() => {
            if (!isProcessing) {
              startRecognition();
            }
          }, 1000);
        };

        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
          isSpeakingRef.current = false;
          setErrorMessage("Gagal memutar suara");

          // Resume listening even if speech fails
          setTimeout(() => {
            if (!isProcessing) {
              startRecognition();
            }
          }, 1000);
        };

        synth.speak(utterance);
      } catch (error) {
        console.error("Speech error:", error);
        isSpeakingRef.current = false;
        setErrorMessage("Gagal memutar suara");
      }
    },
    [isProcessing, startRecognition, synth]
  );

  // Enhanced command handler with better error handling and features
  const handleCommand = useCallback(
    (data) => {
      if (!data) {
        setErrorMessage("Data respons tidak valid");
        return;
      }

      const { type, userInput, response, weatherData, warning } = data;

      // Show warning if using fallback mode
      if (warning) {
        console.warn("Using fallback mode:", warning);
      }

      // Speak the response
      speak(response, true);

      try {
        switch (type) {
          case "google-search":
            if (userInput && userInput.trim()) {
              const query = encodeURIComponent(userInput.trim());
              window.open(`https://www.google.com/search?q=${query}`, "_blank");
            } else {
              window.open(`https://www.google.com/`, "_blank");
            }
            break;

          case "youtube-search":
            if (userInput && userInput.trim()) {
              const query = encodeURIComponent(userInput.trim());
              window.open(
                `https://www.youtube.com/results?search_query=${query}`,
                "_blank"
              );
            } else {
              window.open(`https://www.youtube.com/`, "_blank");
            }
            break;

          case "youtube-play":
            if (userInput && userInput.trim()) {
              const query = encodeURIComponent(userInput.trim());
              // Try to find and play the first video
              window.open(
                `https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`,
                "_blank"
              );
            } else {
              window.open(`https://www.youtube.com/`, "_blank");
            }
            break;

          case "calculator-open":
            // Try to open system calculator, fallback to web calculator
            try {
              window.open(`calculator://`, "_self");
            } catch {
              window.open(
                `https://www.google.com/search?q=calculator`,
                "_blank"
              );
            }
            break;

          case "instagram-open":
            window.open(`https://www.instagram.com/`, "_blank");
            break;

          case "facebook-open":
            window.open(`https://www.facebook.com/`, "_blank");
            break;

          case "weather-show":
            if (weatherData) {
              // Display weather data in a more interactive way
              console.log("Weather data:", weatherData);
              // You could create a modal or overlay to show detailed weather
            }
            // Always open weather search as backup
            window.open(
              `https://www.google.com/search?q=cuaca+jakarta`,
              "_blank"
            );
            break;

          case "get-time":
          case "get-date":
          case "get-day":
          case "get-month":
          case "general":
            // These are handled by speech only, no additional action needed
            break;

          default:
            console.warn("Unknown command type:", type);
            break;
        }
      } catch (error) {
        console.error("Error executing command:", error);
        setErrorMessage("Gagal menjalankan perintah");
      }
    },
    [speak]
  );

  // Enhanced manual command handler with retry logic
  const handleTestCommand = async () => {
    const command = testCommand.trim();
    if (!command) return;

    if (!isOnline) {
      setErrorMessage("Tidak dapat memproses perintah tanpa koneksi internet");
      speak("Maaf, tidak ada koneksi internet");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setUserText(command);
    setAiText("");

    console.log("Testing command:", command);

    try {
      const data = await getGeminiResponse(command);
      console.log("Test result:", data);

      if (data) {
        handleCommand(data);
        setAiText(data.response);
        setTestCommand(""); // Clear input after successful command
      } else {
        const errorMsg = "Maaf, saya tidak dapat memproses permintaan Anda.";
        speak(errorMsg);
        setAiText(errorMsg);
        setErrorMessage("Gagal memproses perintah");
      }
    } catch (error) {
      console.error("Error saat test:", error);
      const errorMsg = "Maaf, terjadi kesalahan sistem.";
      speak(errorMsg);
      setAiText(errorMsg);
      setErrorMessage("Terjadi kesalahan saat memproses perintah");
    } finally {
      setIsProcessing(false);
      setUserText("");
    }
  };

  // Enhanced command processing with debouncing and retry
  const processVoiceCommand = useCallback(
    async (transcript) => {
      // Clear any existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the command processing
      debounceTimeoutRef.current = setTimeout(async () => {
        if (!isOnline) {
          speak("Maaf, tidak ada koneksi internet");
          setErrorMessage("Tidak ada koneksi internet");
          return;
        }

        setIsProcessing(true);
        setErrorMessage("");
        setUserText(transcript);
        setAiText("");

        try {
          console.log("Processing voice command:", transcript);
          const data = await getGeminiResponse(transcript);
          console.log("Voice command result:", data);

          if (data) {
            handleCommand(data);
            setAiText(data.response);
            retryCountRef.current = 0; // Reset retry count on success
          } else {
            throw new Error("No response from server");
          }
        } catch (error) {
          console.error("Error processing voice command:", error);

          // Retry logic
          if (retryCountRef.current < 2) {
            retryCountRef.current++;
            console.log(
              `Retrying voice command (attempt ${retryCountRef.current + 1})`
            );

            setTimeout(() => {
              processVoiceCommand(transcript);
            }, 1000 * retryCountRef.current);

            speak(`Maaf, terjadi kesalahan. Mencoba lagi...`);
          } else {
            const errorMsg =
              "Maaf, saya tidak dapat memproses permintaan Anda saat ini.";
            speak(errorMsg);
            setAiText(errorMsg);
            setErrorMessage(
              "Gagal memproses perintah setelah beberapa percobaan"
            );
            retryCountRef.current = 0;
          }
        } finally {
          setIsProcessing(false);
          setUserText("");
        }
      }, 500); // 500ms debounce delay
    },
    [isOnline, getGeminiResponse, handleCommand, speak]
  );

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Browser tidak mendukung pengenalan suara");
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();

    // Enhanced recognition configuration
    recognition.continuous = true;
    recognition.lang = "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    let isMounted = true;
    let restartTimeout;

    // Enhanced restart function with better error handling
    const restartRecognition = (delay = 1000) => {
      if (!isMounted || isSpeakingRef.current || isProcessing) return;

      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        if (
          isMounted &&
          !isSpeakingRef.current &&
          !isRecognizingRef.current &&
          !isProcessing
        ) {
          try {
            recognition.start();
            console.log("Recognition restarted");
          } catch (err) {
            if (err.name !== "InvalidStateError") {
              console.error("Recognition restart error:", err);
              setErrorMessage("Gagal memulai ulang pengenalan suara");
            }
          }
        }
      }, delay);
    };

    // Initial start with delay
    const startTimeout = setTimeout(() => {
      if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
        try {
          recognition.start();
          console.log("Initial recognition started");
        } catch (err) {
          if (err.name !== "InvalidStateError") {
            console.error("Initial recognition error:", err);
            setErrorMessage("Gagal memulai pengenalan suara");
          }
        }
      }
    }, 2000); // Longer initial delay

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
      setErrorMessage("");
      console.log("Recognition started successfully");
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      console.log("Recognition ended");

      // Auto-restart if not speaking and not processing
      if (isMounted && !isSpeakingRef.current && !isProcessing) {
        restartRecognition(1500);
      }
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);

      // Handle different error types
      switch (event.error) {
        case "network":
          setErrorMessage("Kesalahan jaringan saat pengenalan suara");
          break;
        case "not-allowed":
          setErrorMessage("Akses mikrofon ditolak");
          break;
        case "no-speech":
          // This is normal, just restart
          break;
        case "audio-capture":
          setErrorMessage("Tidak dapat mengakses mikrofon");
          break;
        default:
          if (event.error !== "aborted") {
            setErrorMessage(`Kesalahan pengenalan suara: ${event.error}`);
          }
          break;
      }

      // Restart recognition unless it's a permission error
      if (event.error !== "not-allowed" && event.error !== "audio-capture") {
        restartRecognition(2000);
      }
    };

    recognition.onresult = async (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim();
      const confidence = event.results[event.results.length - 1][0].confidence;

      console.log("Transcript received:", transcript);
      console.log("Confidence:", confidence);
      console.log("Assistant name:", userData.assistantName);

      // Check confidence level
      if (confidence < 0.5) {
        console.log("Low confidence, ignoring transcript");
        return;
      }

      // Check if assistant name is mentioned
      if (
        transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
      ) {
        console.log("Assistant name detected, processing command...");

        // Stop recognition temporarily
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);

        // Process the command
        await processVoiceCommand(transcript);
      } else {
        console.log("Assistant name not detected in:", transcript);
      }
    };

    // Enhanced greeting with error handling
    try {
      const greeting = new SpeechSynthesisUtterance(
        `Halo ${userData.name}, apa yang bisa saya bantu?`
      );
      greeting.lang = "id-ID";
      greeting.rate = 0.9;
      greeting.onend = () => {
        // Start listening after greeting
        setTimeout(() => {
          if (isMounted && !isRecognizingRef.current) {
            startRecognition();
          }
        }, 1000);
      };
      window.speechSynthesis.speak(greeting);
    } catch (error) {
      console.error("Greeting speech error:", error);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      clearTimeout(restartTimeout);
      clearTimeout(debounceTimeoutRef.current);

      try {
        recognition.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }

      setListening(false);
      isRecognizingRef.current = false;
    };
  }, [
    userData.name,
    userData.assistantName,
    isProcessing,
    processVoiceCommand,
    startRecognition,
  ]);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[#000000] to-[#02023d] flex justify-center items-center flex-col gap-[15px] relative overflow-hidden">
      <CgMenuRight
        className="lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer"
        onClick={() => setHam(true)}
      />
      <div
        className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] gap-[20px] flex flex-col items-start cursor-pointer ${
          ham ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 ease-in-out`}
      >
        <RxCross1
          className="top-[20px] right-[20px] w-[25px] h-[25px] text-white absolute"
          onClick={() => setHam(false)}
        />
        <button
          type="submit"
          className="min-w-[150px] h-[50px] bg-blue-400 text-white font-semibold rounded-full text-[18px] hover:bg-blue-500 transition-colors cursor-pointer"
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          type="submit"
          className="min-w-[150px] h-[50px] bg-blue-400 text-white font-semibold rounded-full text-[18px] px-[20px] py-[10px] hover:bg-blue-500 transition-colors cursor-pointer"
          onClick={() => navigate("/customize")}
        >
          Pilih Asisten Virtual
        </button>
        <div className="w-full h-[2px] bg-gray-400"></div>
        <h1 className="text-white text-[18px] font-semibold">History</h1>
        <div className="w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col">
          {userData.history?.map((his, index) => (
            <div
              key={index}
              className="text-gray-200 text-[14px] p-2 bg-gray-800/30 rounded"
            >
              <div className="truncate">
                {typeof his === "string" ? his : his.command || his}
              </div>
              {his.timestamp && (
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(his.timestamp).toLocaleString("id-ID")}
                </div>
              )}
            </div>
          ))}
          {(!userData.history || userData.history.length === 0) && (
            <div className="text-gray-400 text-center text-sm">
              Belum ada riwayat perintah
            </div>
          )}
        </div>
      </div>
      <button
        type="submit"
        className="min-w-[150px] h-[50px] mt-[30px] absolute hidden lg:block top-[20px] right-[20px] bg-blue-400 text-white font-semibold rounded-full text-[18px] hover:bg-blue-500 transition-colors cursor-pointer"
        onClick={handleLogOut}
      >
        Log Out
      </button>
      <button
        type="submit"
        className="min-w-[150px] h-[50px] mt-[30px] absolute hidden lg:block top-[100px] right-[20px] bg-blue-400 text-white font-semibold rounded-full text-[18px] px-[20px] py-[10px] hover:bg-blue-500 transition-colors cursor-pointer"
        onClick={() => navigate("/customize")}
      >
        Pilih Asisten Virtual
      </button>
      <div className="w-[150px] h-[220px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt=""
          className="h-full object-cover"
        />
      </div>
      <h1 className="text-white text-[18px] font-semibold">
        {userData?.assistantName}
      </h1>
      {!aiText && <img src={userImg} alt="" className="w-[100px]" />}
      {aiText && <img src={aiImg} alt="" className="w-[100px]" />}
      <h1 className="text-white text-[16px] font-semibold text-wrap">
        {userText ? userText : aiText ? aiText : null}
      </h1>

      {/* Enhanced Status Indicators */}
      <div className="text-white text-center mt-4 space-y-2">
        {/* Connection Status */}
        <div className="flex items-center justify-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isOnline ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
        </div>

        {/* Listening Status */}
        <div className="flex items-center justify-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              listening ? "bg-blue-500 animate-pulse" : "bg-gray-500"
            }`}
          ></div>
          <span className="text-sm">
            {listening ? "Mendengarkan..." : "Standby"}
          </span>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-spin"></div>
            <span className="text-sm">Memproses...</span>
          </div>
        )}

        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mt-2 max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-red-300 text-sm">{errorMessage}</span>
              <button
                onClick={() => setErrorMessage("")}
                className="ml-2 text-red-400 hover:text-red-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-white text-xs text-center mt-2 opacity-70">
        Katakan "{userData?.assistantName}" untuk memulai perintah suara
      </div>

      {/* Enhanced Manual Command Interface */}
      <div className="mt-4 w-full max-w-md space-y-2">
        <input
          type="text"
          value={testCommand}
          onChange={(e) => setTestCommand(e.target.value)}
          placeholder="Ketik perintah manual..."
          className="w-full px-4 py-3 rounded-lg text-white bg-[#00000060] border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isProcessing) {
              handleTestCommand();
            }
          }}
          disabled={isProcessing || !isOnline}
        />
        <button
          onClick={handleTestCommand}
          disabled={isProcessing || !testCommand.trim() || !isOnline}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
            isProcessing || !testCommand.trim() || !isOnline
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-green-500 text-white hover:bg-green-600 active:scale-95"
          }`}
        >
          {isProcessing ? "Memproses..." : "Kirim Perintah"}
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-md">
        <button
          onClick={() => setTestCommand("jam berapa sekarang")}
          disabled={isProcessing}
          className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          Jam Berapa?
        </button>
        <button
          onClick={() => setTestCommand("tanggal hari ini")}
          disabled={isProcessing}
          className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          Tanggal Hari Ini
        </button>
        <button
          onClick={() => setTestCommand("cuaca hari ini")}
          disabled={isProcessing}
          className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          Cek Cuaca
        </button>
        <button
          onClick={() => setTestCommand("cari di google teknologi AI")}
          disabled={isProcessing}
          className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          Cari Google
        </button>
      </div>
    </div>
  );
}

export default Home;
