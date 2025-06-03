import axios from "axios";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState, useCallback } from "react";

import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";
import { UserDataContext } from "../context/userDataContext.js";

function Home() {
  const navigate = useNavigate();
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(UserDataContext);

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [testCommand, setTestCommand] = useState("");
  const [ham, setHam] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // UI State untuk collapsible sections
  const [showManualInput, setShowManualInput] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showBrowserActions, setShowBrowserActions] = useState(false);

  // State untuk konfirmasi browser action
  const [pendingBrowserAction, setPendingBrowserAction] = useState(null);

  // State untuk greeting (hanya sekali per session)
  const [hasGreeted, setHasGreeted] = useState(false);

  // Enhanced microphone states
  const [microphoneStatus, setMicrophoneStatus] = useState("disconnected"); // disconnected, connecting, connected, error
  const [audioLevel, setAudioLevel] = useState(0);
  const [microphonePermission, setMicrophonePermission] = useState("unknown"); // unknown, granted, denied
  const [fallbackMode, setFallbackMode] = useState(false);
  const [microphoneQuality, setMicrophoneQuality] = useState("unknown"); // unknown, poor, good, excellent

  const isSpeakingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const recognitionRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const synth = window.speechSynthesis;

  // Enhanced microphone monitoring and audio level detection
  const initializeMicrophone = useCallback(async () => {
    try {
      setMicrophoneStatus("connecting");

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      microphoneStreamRef.current = stream;
      setMicrophonePermission("granted");
      setMicrophoneStatus("connected");

      // Initialize audio context for level monitoring
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring audio levels
      monitorAudioLevel();

      console.log("Microphone initialized successfully");
      return true;
    } catch (error) {
      console.error("Microphone initialization failed:", error);
      setMicrophoneStatus("error");

      if (error.name === "NotAllowedError") {
        setMicrophonePermission("denied");
        setErrorMessage(
          "Akses mikrofon ditolak. Silakan izinkan akses mikrofon di pengaturan browser."
        );
      } else if (error.name === "NotFoundError") {
        setErrorMessage(
          "Mikrofon tidak ditemukan. Pastikan mikrofon terhubung."
        );
      } else {
        setErrorMessage("Gagal mengakses mikrofon. Coba refresh halaman.");
      }
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor audio level for visual feedback
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedLevel = Math.min(100, (average / 128) * 100);

      setAudioLevel(normalizedLevel);

      // Determine microphone quality based on audio level patterns
      if (normalizedLevel > 50) {
        setMicrophoneQuality("excellent");
      } else if (normalizedLevel > 20) {
        setMicrophoneQuality("good");
      } else if (normalizedLevel > 5) {
        setMicrophoneQuality("poor");
      } else {
        setMicrophoneQuality("unknown");
      }

      requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, []);

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
      window.removeEventListener("online", handleOffline);
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

  // Enhanced start recognition with microphone check
  const startRecognition = useCallback(async () => {
    if (!isOnline) {
      setErrorMessage(
        "Tidak dapat memulai pengenalan suara tanpa koneksi internet"
      );
      return;
    }

    // Check microphone status first
    if (microphoneStatus === "disconnected" || microphoneStatus === "error") {
      console.log("Initializing microphone...");
      const micInitialized = await initializeMicrophone();
      if (!micInitialized) {
        setFallbackMode(true);
        setErrorMessage(
          "Mikrofon tidak tersedia. Gunakan input manual di bawah."
        );
        return;
      }
    }

    // Check microphone permission
    if (microphonePermission === "denied") {
      setFallbackMode(true);
      setErrorMessage(
        "Akses mikrofon ditolak. Gunakan input manual atau izinkan akses mikrofon."
      );
      return;
    }

    try {
      if (recognitionRef.current && !isRecognizingRef.current) {
        recognitionRef.current.start();
        setListening(true);
        setErrorMessage("");
        setFallbackMode(false);
        console.log("Enhanced recognition started");
      }
    } catch (error) {
      if (
        !error.message.includes("start") &&
        !error.message.includes("already")
      ) {
        console.error("Recognition error: ", error);
        setErrorMessage(
          "Gagal memulai pengenalan suara. Coba gunakan input manual."
        );
        setFallbackMode(true);
      }
    }
  }, [isOnline, microphoneStatus, microphonePermission, initializeMicrophone]);

  // Stop recognition manually
  const stopRecognition = useCallback(() => {
    try {
      if (recognitionRef.current && isRecognizingRef.current) {
        recognitionRef.current.stop();
        setListening(false);
        console.log("Manual recognition stop");
      }
    } catch (error) {
      console.error("Error stopping recognition:", error);
    }
  }, []);

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
          // Speech started
        };

        utterance.onend = () => {
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

  // Enhanced command handler with popup blocker workaround
  const handleCommand = useCallback(
    (data) => {
      if (!data) {
        setErrorMessage("Data respons tidak valid");
        return;
      }

      const { type, userInput, response, warning } = data;

      // Show warning if using fallback mode
      if (warning) {
        // Using fallback mode
      }

      // Speak the response
      speak(response, true);

      try {
        // Workaround untuk popup blocker: buka tab kosong dulu
        let newTab = null;
        const needsNewTab = [
          "google-search",
          "youtube-search",
          "youtube-play",
          "calculator-open",
          "instagram-open",
          "facebook-open",
          "weather-show",
        ].includes(type);

        if (needsNewTab) {
          try {
            // Coba buka tab baru terlebih dahulu
            newTab = window.open("about:blank", "_blank");
            if (!newTab) {
              throw new Error("Popup blocked");
            }
          } catch {
            // Popup blocked, using same tab
            newTab = null;
          }
        }

        switch (type) {
          case "google-search": {
            const googleUrl =
              userInput && userInput.trim()
                ? `https://www.google.com/search?q=${encodeURIComponent(
                    userInput.trim()
                  )}`
                : `https://www.google.com/`;

            if (newTab) {
              newTab.location.href = googleUrl;
              speak("Membuka Google di tab baru.");
            } else {
              // Jika popup diblokir, tawarkan pilihan
              setPendingBrowserAction({
                type: "google-search",
                url: googleUrl,
                message: "Google",
              });
              speak(
                "Browser memblokir popup. Apakah Anda ingin membuka Google di tab ini? Katakan ya atau tidak."
              );
              setErrorMessage(
                "Popup diblokir - Katakan 'ya' untuk buka di tab ini, atau gunakan tombol manual"
              );
              setShowBrowserActions(true);
            }
            break;
          }

          case "youtube-search": {
            const youtubeSearchUrl =
              userInput && userInput.trim()
                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
                    userInput.trim()
                  )}`
                : `https://www.youtube.com/`;

            if (newTab) {
              newTab.location.href = youtubeSearchUrl;
            } else {
              speak(
                "Browser memblokir popup. Silakan gunakan tombol manual di bawah untuk membuka YouTube."
              );
              setErrorMessage(
                "Popup diblokir - gunakan tombol 'Buka Website' di bawah"
              );
              setShowBrowserActions(true); // Auto-expand browser actions
            }
            break;
          }

          case "youtube-play": {
            const youtubePlayUrl =
              userInput && userInput.trim()
                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
                    userInput.trim()
                  )}&sp=EgIQAQ%253D%253D`
                : `https://www.youtube.com/`;

            if (newTab) {
              newTab.location.href = youtubePlayUrl;
            } else {
              speak(
                "Browser memblokir popup. Silakan gunakan tombol manual di bawah untuk membuka YouTube."
              );
              setErrorMessage(
                "Popup diblokir - gunakan tombol 'Buka Website' di bawah"
              );
              setShowBrowserActions(true); // Auto-expand browser actions
            }
            break;
          }

          case "calculator-open": {
            // Try system calculator first, fallback to web
            const calcUrl = `https://www.google.com/search?q=calculator`;
            if (newTab) {
              try {
                newTab.location.href = `calculator://`;
              } catch {
                newTab.location.href = calcUrl;
              }
            } else {
              speak(
                "Browser memblokir popup. Silakan gunakan tombol manual di bawah untuk membuka kalkulator."
              );
              setErrorMessage(
                "Popup diblokir - gunakan tombol 'Buka Website' di bawah"
              );
              setShowBrowserActions(true); // Auto-expand browser actions
            }
            break;
          }

          case "instagram-open": {
            const instagramUrl = `https://www.instagram.com/`;
            if (newTab) {
              newTab.location.href = instagramUrl;
            } else {
              speak(
                "Browser memblokir popup. Silakan gunakan tombol manual di bawah untuk membuka Instagram."
              );
              setErrorMessage(
                "Popup diblokir - gunakan tombol 'Buka Website' di bawah"
              );
              setShowBrowserActions(true); // Auto-expand browser actions
            }
            break;
          }

          case "facebook-open": {
            const facebookUrl = `https://www.facebook.com/`;
            if (newTab) {
              newTab.location.href = facebookUrl;
            } else {
              speak(
                "Browser memblokir popup. Silakan gunakan tombol manual di bawah untuk membuka Facebook."
              );
              setErrorMessage(
                "Popup diblokir - gunakan tombol 'Buka Website' di bawah"
              );
              setShowBrowserActions(true); // Auto-expand browser actions
            }
            break;
          }

          case "weather-show": {
            const weatherUrl = `https://www.google.com/search?q=cuaca+jakarta`;
            if (newTab) {
              newTab.location.href = weatherUrl;
            } else {
              speak(
                "Browser memblokir popup. Silakan gunakan tombol manual di bawah untuk melihat cuaca."
              );
              setErrorMessage(
                "Popup diblokir - gunakan tombol 'Buka Website' di bawah"
              );
              setShowBrowserActions(true); // Auto-expand browser actions
            }
            break;
          }

          case "get-time":
          case "get-date":
          case "get-day":
          case "get-month":
          case "general":
            // These are handled by speech only, no additional action needed
            break;

          default:
            // Close unused tab if opened
            if (newTab) {
              newTab.close();
            }
            break;
        }

        // Show success message for browser actions
        if (needsNewTab) {
          setErrorMessage("");
        }
      } catch (error) {
        console.error("Error executing command:", error);
        setErrorMessage(
          "Gagal menjalankan perintah - pastikan popup tidak diblokir browser"
        );

        // Show user-friendly popup blocker message
        if (error.message.includes("Popup blocked")) {
          speak(
            "Maaf, browser memblokir popup. Silakan izinkan popup untuk situs ini atau gunakan tombol manual."
          );
        }
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

    try {
      const data = await getGeminiResponse(command);

      if (data) {
        handleCommand(data);
        setAiText(data.response);
        setTestCommand(""); // Clear input after successful command
        setShowManualInput(false); // Auto-collapse after successful command
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

  // Auto-expand manual input when user starts typing
  const handleInputChange = (e) => {
    setTestCommand(e.target.value);
    if (e.target.value.length > 0 && !showManualInput) {
      setShowManualInput(true);
    }
  };

  // Handle quick action clicks
  const handleQuickAction = (command) => {
    setTestCommand(command);
    setShowManualInput(true); // Show manual input when quick action is used
    setShowQuickActions(false); // Auto-collapse quick actions
  };

  // Handle browser action confirmation
  const handleBrowserConfirmation = useCallback(
    (confirmed) => {
      if (pendingBrowserAction && confirmed) {
        window.location.href = pendingBrowserAction.url;
      } else if (pendingBrowserAction && !confirmed) {
        speak(
          `Baik, ${pendingBrowserAction.message} tidak dibuka. Anda bisa menggunakan tombol manual jika diperlukan.`
        );
      }
      setPendingBrowserAction(null);
      setErrorMessage("");
    },
    [pendingBrowserAction, speak]
  );

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

    // Enhanced restart function with better error handling and throttling
    let restartAttempts = 0;
    const maxRestartAttempts = 3; // Reduced from 5 to 3
    let lastRestartTime = 0;
    const minRestartInterval = 5000; // Minimum 5 seconds between restarts

    const restartRecognition = (delay = 3000) => {
      // Increased default delay
      if (!isMounted || isSpeakingRef.current || isProcessing) return;

      const now = Date.now();
      if (now - lastRestartTime < minRestartInterval) {
        console.log("Restart throttled - too soon since last restart");
        return;
      }

      // Throttle restart attempts to prevent infinite loops
      if (restartAttempts >= maxRestartAttempts) {
        console.log(
          "Max restart attempts reached, stopping auto-restart for 30 seconds"
        );
        setErrorMessage(
          "Pengenalan suara dihentikan sementara. Klik tombol mikrofon untuk mengaktifkan kembali."
        );

        // Reset after 30 seconds
        setTimeout(() => {
          restartAttempts = 0;
          console.log("Restart attempts reset");
        }, 30000);
        return;
      }

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
            lastRestartTime = Date.now();
            restartAttempts++;
            console.log(`Recognition restarted (attempt ${restartAttempts})`);

            // Reset restart attempts after successful operation
            setTimeout(() => {
              if (restartAttempts > 0) {
                restartAttempts = Math.max(0, restartAttempts - 1);
                console.log(`Restart attempts decreased to ${restartAttempts}`);
              }
            }, 15000); // Reset after 15 seconds of successful operation
          } catch (err) {
            if (err.name !== "InvalidStateError") {
              console.error("Recognition restart error:", err);
              if (restartAttempts < maxRestartAttempts) {
                // Try again with longer delay
                restartRecognition(Math.min(delay * 1.5, 10000)); // Cap at 10 seconds
              }
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

      // Auto-restart if not speaking and not processing, with longer delay
      if (isMounted && !isSpeakingRef.current && !isProcessing) {
        restartRecognition(3000); // Increased from 1500 to 3000ms
      }
    };

    recognition.onerror = (event) => {
      isRecognizingRef.current = false;
      setListening(false);

      // Handle different error types
      switch (event.error) {
        case "network":
          console.error("Recognition network error:", event.error);
          setErrorMessage("Kesalahan jaringan saat pengenalan suara");
          break;
        case "not-allowed":
          console.error("Recognition permission error:", event.error);
          setErrorMessage("Akses mikrofon ditolak");
          break;
        case "no-speech":
          // This is normal - no speech detected, restart with longer delay
          console.log("No speech detected, will restart after delay...");
          break;
        case "audio-capture":
          console.error("Recognition audio error:", event.error);
          setErrorMessage("Tidak dapat mengakses mikrofon");
          break;
        case "aborted":
          // This is normal when recognition is stopped intentionally
          console.log("Recognition aborted (normal)");
          break;
        default:
          console.error("Recognition error:", event.error);
          setErrorMessage(`Kesalahan pengenalan suara: ${event.error}`);
          break;
      }

      // Restart recognition unless it's a permission error
      if (event.error !== "not-allowed" && event.error !== "audio-capture") {
        // Use longer delay for no-speech to reduce spam
        const delay = event.error === "no-speech" ? 5000 : 2000;
        restartRecognition(delay);
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

      // Check for browser action confirmation first
      if (pendingBrowserAction) {
        const lowerTranscript = transcript.toLowerCase();
        if (
          lowerTranscript.includes("ya") ||
          lowerTranscript.includes("iya") ||
          lowerTranscript.includes("yes")
        ) {
          console.log("User confirmed browser action");
          handleBrowserConfirmation(true);
          return;
        } else if (
          lowerTranscript.includes("tidak") ||
          lowerTranscript.includes("no") ||
          lowerTranscript.includes("batal")
        ) {
          console.log("User declined browser action");
          handleBrowserConfirmation(false);
          return;
        }
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

    // Enhanced greeting with error handling (only once per session)
    if (!hasGreeted) {
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
        setHasGreeted(true); // Mark as greeted
      } catch (error) {
        console.error("Greeting speech error:", error);
        // Start listening even if greeting fails
        setTimeout(() => {
          if (isMounted && !isRecognizingRef.current) {
            startRecognition();
          }
        }, 1000);
      }
    } else {
      // Skip greeting, start listening directly
      setTimeout(() => {
        if (isMounted && !isRecognizingRef.current) {
          startRecognition();
        }
      }, 1000);
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
    hasGreeted,
    handleBrowserConfirmation,
    pendingBrowserAction,
  ]);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[#000000] to-[#02023d] flex flex-col relative overflow-hidden">
      {/* Header dengan Menu */}
      <div className="flex justify-between items-center p-4 z-10">
        <div className="text-white text-lg font-semibold">AI Assistant</div>
        <div className="flex items-center gap-3">
          {/* Status Indicators - Compact */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-xs text-gray-300">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  listening ? "bg-blue-500 animate-pulse" : "bg-gray-500"
                }`}
              ></div>
              <span className="text-xs text-gray-300">
                {listening ? "Listening" : "Standby"}
              </span>
            </div>
          </div>

          {/* Desktop Buttons */}
          <button
            className="hidden lg:block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            onClick={() => navigate("/customize")}
          >
            Pilih Asisten
          </button>
          <button
            className="hidden lg:block px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
            onClick={handleLogOut}
          >
            Logout
          </button>

          {/* Mobile Menu Button */}
          <CgMenuRight
            className="lg:hidden text-white w-6 h-6 cursor-pointer"
            onClick={() => setHam(true)}
          />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] gap-[20px] flex flex-col items-start cursor-pointer z-50 ${
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
                {typeof his === "string"
                  ? his
                  : his && typeof his === "object" && his.command
                  ? his.command
                  : his && typeof his === "object"
                  ? JSON.stringify(his)
                  : "Perintah tidak valid"}
              </div>
              {his && typeof his === "object" && his.timestamp && (
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

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-4 overflow-y-auto">
        {/* Assistant Avatar Section - Fixed at top */}
        <div className="flex flex-col items-center mb-6 mt-4">
          <div className="w-32 h-40 lg:w-36 lg:h-44 flex justify-center items-center overflow-hidden rounded-3xl shadow-lg mb-3">
            <img
              src={userData?.assistantImage}
              alt=""
              className="h-full object-cover"
            />
          </div>
          <h1 className="text-white text-lg font-semibold mb-2">
            {userData?.assistantName}
          </h1>

          {/* Conversation Icons */}
          <div className="flex items-center gap-3 mb-3">
            {!aiText && <img src={userImg} alt="" className="w-16 h-16" />}
            {aiText && <img src={aiImg} alt="" className="w-16 h-16" />}
          </div>

          {/* Conversation Text */}
          {(userText || aiText) && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 max-w-sm text-center">
              <p className="text-white text-sm">{userText || aiText}</p>
            </div>
          )}
        </div>

        {/* Mobile Status Indicators */}
        <div className="lg:hidden flex justify-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-xs text-gray-300">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                listening ? "bg-blue-500 animate-pulse" : "bg-gray-500"
              }`}
            ></div>
            <span className="text-xs text-gray-300">
              {listening ? "Listening" : "Standby"}
            </span>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-spin"></div>
              <span className="text-xs text-gray-300">Processing</span>
            </div>
          )}
        </div>

        {/* Enhanced Microphone Status Display */}
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 mb-4 max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm font-medium">
                Status Mikrofon
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    microphoneStatus === "connected"
                      ? "bg-green-500"
                      : microphoneStatus === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : microphoneStatus === "error"
                      ? "bg-red-500"
                      : "bg-gray-500"
                  }`}
                ></div>
                <span
                  className={`text-xs ${
                    microphoneStatus === "connected"
                      ? "text-green-400"
                      : microphoneStatus === "connecting"
                      ? "text-yellow-400"
                      : microphoneStatus === "error"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {microphoneStatus === "connected"
                    ? "Terhubung"
                    : microphoneStatus === "connecting"
                    ? "Menghubungkan..."
                    : microphoneStatus === "error"
                    ? "Error"
                    : "Terputus"}
                </span>
              </div>
            </div>

            {/* Audio Level Indicator */}
            {microphoneStatus === "connected" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Level Audio</span>
                  <span
                    className={`text-xs ${
                      microphoneQuality === "excellent"
                        ? "text-green-400"
                        : microphoneQuality === "good"
                        ? "text-blue-400"
                        : microphoneQuality === "poor"
                        ? "text-yellow-400"
                        : "text-gray-400"
                    }`}
                  >
                    {microphoneQuality === "excellent"
                      ? "Sangat Baik"
                      : microphoneQuality === "good"
                      ? "Baik"
                      : microphoneQuality === "poor"
                      ? "Kurang"
                      : "Tidak Diketahui"}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      audioLevel > 50
                        ? "bg-green-500"
                        : audioLevel > 20
                        ? "bg-blue-500"
                        : audioLevel > 5
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }`}
                    style={{ width: `${Math.min(audioLevel, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Fallback Mode Indicator */}
            {fallbackMode && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-xs">⚠️</span>
                  <span className="text-yellow-300 text-xs">
                    Mode Manual Aktif
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 max-w-sm">
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

        {/* Browser Action Confirmation Dialog */}
        {pendingBrowserAction && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-4 max-w-sm animate-fadeIn">
            <div className="text-center space-y-3">
              <p className="text-blue-300 text-sm">
                Buka {pendingBrowserAction.message} di tab ini?
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleBrowserConfirmation(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                >
                  Ya, Buka
                </button>
                <button
                  onClick={() => handleBrowserConfirmation(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Tidak
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Atau katakan "ya" / "tidak" dengan suara
              </p>
            </div>
          </div>
        )}

        {/* Voice Command Hint */}
        <div className="text-center mb-6">
          <p className="text-white text-xs opacity-70">
            Katakan "{userData?.assistantName}" untuk memulai perintah suara
          </p>
          <div className="flex gap-2 justify-center mt-2">
            {!listening ? (
              <button
                onClick={startRecognition}
                className="px-3 py-1 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-xs hover:bg-blue-500/30 transition-colors"
              >
                🎤 Aktifkan Mikrofon
              </button>
            ) : (
              <button
                onClick={stopRecognition}
                className="px-3 py-1 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-xs hover:bg-red-500/30 transition-colors"
              >
                🔇 Matikan Mikrofon
              </button>
            )}
          </div>
        </div>

        {/* Compact Control Buttons */}
        <div className="w-full max-w-sm space-y-3">
          {/* Manual Input Toggle */}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="w-full py-2 px-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-all duration-200 flex items-center justify-between"
          >
            <span>💬 Input Manual</span>
            <span
              className={`transform transition-transform ${
                showManualInput ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {/* Manual Input Section - Collapsible */}
          {showManualInput && (
            <div className="space-y-2 animate-fadeIn">
              <input
                type="text"
                value={testCommand}
                onChange={handleInputChange}
                placeholder="Ketik perintah manual..."
                className="w-full px-4 py-3 rounded-lg text-white bg-[#00000060] border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isProcessing) {
                    handleTestCommand();
                  }
                }}
                disabled={isProcessing || !isOnline}
                autoFocus={showManualInput}
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
          )}

          {/* Quick Actions Toggle */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="w-full py-2 px-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-all duration-200 flex items-center justify-between"
          >
            <span>⚡ Aksi Cepat</span>
            <span
              className={`transform transition-transform ${
                showQuickActions ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {/* Quick Actions Section - Collapsible */}
          {showQuickActions && (
            <div className="grid grid-cols-2 gap-2 animate-fadeIn">
              <button
                onClick={() => handleQuickAction("jam berapa sekarang")}
                disabled={isProcessing}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                🕐 Jam
              </button>
              <button
                onClick={() => handleQuickAction("tanggal hari ini")}
                disabled={isProcessing}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                📅 Tanggal
              </button>
              <button
                onClick={() => handleQuickAction("cuaca hari ini")}
                disabled={isProcessing}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                🌤️ Cuaca
              </button>
              <button
                onClick={() => handleQuickAction("cari di google teknologi AI")}
                disabled={isProcessing}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                🔍 Google
              </button>
            </div>
          )}

          {/* Browser Actions Toggle */}
          <button
            onClick={() => setShowBrowserActions(!showBrowserActions)}
            className="w-full py-2 px-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-all duration-200 flex items-center justify-between"
          >
            <span>🌐 Buka Website</span>
            <span
              className={`transform transition-transform ${
                showBrowserActions ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {/* Browser Actions Section - Collapsible */}
          {showBrowserActions && (
            <div className="space-y-3 animate-fadeIn">
              <p className="text-xs text-gray-400 text-center">
                Jika perintah suara tidak bisa buka browser:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() =>
                    window.open("https://www.google.com/", "_blank")
                  }
                  className="p-2 bg-gray-600/50 border border-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs"
                >
                  🔍 Google
                </button>
                <button
                  onClick={() =>
                    window.open("https://www.youtube.com/", "_blank")
                  }
                  className="p-2 bg-red-600/50 border border-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs"
                >
                  📺 YouTube
                </button>
                <button
                  onClick={() =>
                    window.open("https://www.instagram.com/", "_blank")
                  }
                  className="p-2 bg-pink-600/50 border border-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-xs"
                >
                  📷 Instagram
                </button>
                <button
                  onClick={() =>
                    window.open("https://www.facebook.com/", "_blank")
                  }
                  className="p-2 bg-blue-600/50 border border-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs"
                >
                  📘 Facebook
                </button>
                <button
                  onClick={() =>
                    window.open(
                      "https://www.google.com/search?q=calculator",
                      "_blank"
                    )
                  }
                  className="p-2 bg-green-600/50 border border-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs"
                >
                  🧮 Kalkulator
                </button>
                <button
                  onClick={() =>
                    window.open(
                      "https://www.google.com/search?q=cuaca+jakarta",
                      "_blank"
                    )
                  }
                  className="p-2 bg-cyan-600/50 border border-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-xs"
                >
                  🌤️ Cuaca
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
