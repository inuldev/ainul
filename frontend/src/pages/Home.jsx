import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";

import { userDataContext } from "../context/UserContext";

function Home() {
  const navigate = useNavigate();
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext);

  const [_listening, setListening] = useState(false);
  const [testCommand, setTestCommand] = useState("");
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const synth = window.speechSynthesis;

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

  const startRecognition = () => {
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch (error) {
      if (!error.message.includes("start")) {
        console.error("Recognition error: ", error);
      }
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";

    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find((v) => v.lang === "id-ID");
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    isSpeakingRef.current = true;
    utterance.onend = () => {
      isSpeakingRef.current = false;
      startRecognition();
    };
    synth.speak(utterance);
  };

  const handleCommand = (data) => {
    const { type, userInput, response } = data;
    speak(response);
    if (type === "google-search") {
      const query = encodeURIComponent(userInput);
      window.open(`https://www.google.com/search?q=${query}`, "_blank");
    }
    if (type === "calculator-open") {
      window.open(`https://www.google.com/search?q=calculator`, "_blank");
    }
    if (type === "instagram-open") {
      window.open(`https://www.instagram.com/`, "_blank");
    }
    if (type === "facebook-open") {
      window.open(`https://www.facebook.com/`, "_blank");
    }
    if (type === "weather-show") {
      window.open(`https://www.google.com/search?q=weather`, "_blank");
    }
    if (type === "youtube-search" || type === "youtube-play") {
      const query = encodeURIComponent(userInput);
      window.open(
        `https://www.youtube.com/results?search_query=${query}`,
        "_blank"
      );
    }
  };

  // Fungsi untuk test manual
  const handleTestCommand = async () => {
    if (!testCommand.trim()) return;

    console.log("Testing command:", testCommand);
    try {
      const data = await getGeminiResponse(testCommand);
      console.log("Test result:", data);
      if (data) {
        handleCommand(data);
      } else {
        speak("Maaf, saya tidak dapat memproses permintaan Anda.");
      }
    } catch (error) {
      console.error("Error saat test:", error);
      speak("Maaf, terjadi kesalahan.");
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "id-ID";

    recognitionRef.current = recognition;
    const isRecognizingRef = { current: false };

    const safeRecognition = () => {
      if (!isSpeakingRef.current && !isRecognizingRef.current) {
        try {
          recognition.start();
        } catch (err) {
          if (err.name !== "InvalidStateError") {
            console.error("Start error: ", err);
          }
        }
      }
    };

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);

      if (!isSpeakingRef.current) {
        setTimeout(() => {
          safeRecognition();
        }, 1000);
      }
    };

    recognition.onerror = (e) => {
      isRecognizingRef.current = false;
      setListening(false);
      if (e.error !== "aborted" && !isSpeakingRef.current) {
        setTimeout(() => {
          safeRecognition();
        }, 1000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log("Transcript diterima:", transcript);
      console.log("Nama asisten:", userData.assistantName);

      if (
        transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
      ) {
        console.log("Nama asisten terdeteksi, memproses perintah...");
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);

        try {
          const data = await getGeminiResponse(transcript);
          console.log("Data dari Gemini:", data);
          if (data) {
            handleCommand(data);
          } else {
            speak("Maaf, saya tidak dapat memproses permintaan Anda.");
          }
        } catch (error) {
          console.error("Error saat memproses perintah:", error);
          speak("Maaf, terjadi kesalahan.");
        }
      } else {
        console.log("Nama asisten tidak terdeteksi dalam:", transcript);
      }
    };

    const fallback = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current) {
        safeRecognition();
      }
    }, 1000);

    safeRecognition();

    return () => {
      recognition.stop();
      setListening(false);
      isRecognizingRef.current = false;
      clearInterval(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[#000000] to-[#02023d] flex justify-center items-center flex-col gap-[15px] relative">
      <button
        type="submit"
        className="min-w-[150px] h-[50px] mt-[30px] absolute top-[20px] right-[20px] bg-blue-400 text-white font-semibold rounded-full text-[18px] hover:bg-blue-500 transition-colors cursor-pointer"
        onClick={handleLogOut}
      >
        Log Out
      </button>
      <button
        type="submit"
        className="min-w-[150px] h-[50px] mt-[30px] absolute top-[100px] right-[20px] bg-blue-400 text-white font-semibold rounded-full text-[18px] px-[20px] py-[10px] hover:bg-blue-500 transition-colors cursor-pointer"
        onClick={() => navigate("/customize")}
      >
        Pilih Asisten Virtual
      </button>
      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt=""
          className="h-full object-cover"
        />
      </div>
      <h1 className="text-white text-[18px] font-semibold">
        {userData?.assistantName}
      </h1>

      {/* Status Indicator untuk Debugging */}
      <div className="text-white text-center mt-4">
        <div
          className={`inline-block w-3 h-3 rounded-full mr-2 ${
            _listening ? "bg-green-500" : "bg-red-500"
          }`}
        ></div>
        <span className="text-sm">
          {_listening ? "Mendengarkan..." : "Tidak Mendengarkan"}
        </span>
      </div>

      <div className="text-white text-xs text-center mt-2 opacity-70">
        Katakan "{userData?.assistantName}" untuk memulai perintah
      </div>

      {/* Test Manual Command */}
      <div className="mt-6 w-full max-w-md">
        <input
          type="text"
          value={testCommand}
          onChange={(e) => setTestCommand(e.target.value)}
          placeholder="Test perintah manual..."
          className="w-full px-4 py-2 rounded-lg text-black"
          onKeyPress={(e) => e.key === "Enter" && handleTestCommand()}
        />
        <button
          onClick={handleTestCommand}
          className="w-full mt-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
        >
          Test Perintah
        </button>
      </div>
    </div>
  );
}

export default Home;
