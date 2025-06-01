import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";

import { userDataContext } from "../context/UserContext";

function Home() {
  const navigate = useNavigate();
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext);

  const [_listening, setListening] = useState(false);
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

      if (
        transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
      ) {
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);
        const data = await getGeminiResponse(transcript);
        handleCommand(data);
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
    </div>
  );
}

export default Home;
