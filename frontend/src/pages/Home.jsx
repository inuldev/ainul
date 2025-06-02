import axios from "axios";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";

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
  const isSpeakingRef = useRef(false);
  const isRecognizingRef = useRef(false);
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
      setAiText("");
      isSpeakingRef.current = false;
      setTimeout(() => {
        startRecognition();
      }, 1000);
    };
    synth.cancel();
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
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    let isMounted = true;

    const startTimeout = setTimeout(() => {
      if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
        try {
          recognition.start();
          console.log("Recognition started");
        } catch (err) {
          if (err.name !== "InvalidStateError") {
            console.error(err);
          }
        }
      }
    }, 1000);

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (isMounted && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();
              console.log("Recognition started");
            } catch (err) {
              if (err.name !== "InvalidStateError") console.error(err);
            }
          }
        }, 1000);
      }
    };

    recognition.onerror = (e) => {
      isRecognizingRef.current = false;
      setListening(false);
      if (e.error !== "aborted" && isMounted && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();
              console.log("Recognition started after error");
            } catch (err) {
              if (err.name !== "InvalidStateError") console.error(err);
            }
          }
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
        setAiText("");
        setUserText(transcript);
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);

        try {
          const data = await getGeminiResponse(transcript);
          console.log("Data dari Gemini:", data);
          if (data) {
            handleCommand(data);
            setAiText(data.response);
            setUserText("");
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

    const greeting = new SpeechSynthesisUtterance(
      `Halo ${userData.name}, apa yang bisa saya bantu?`
    );
    greeting.lang = "id-ID";
    window.speechSynthesis.speak(greeting);

    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      recognition.stop();
      setListening(false);
      isRecognizingRef.current = false;
    };
  }, []);

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
          {userData.history?.map((his) => (
            <span className="text-gray-200 text-[16px] truncate">{his}</span>
          ))}
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

      {/* Status Indicator untuk Debugging */}
      <div className="text-white text-center mt-2">
        <div
          className={`inline-block w-3 h-3 rounded-full mr-2 ${
            listening ? "bg-green-500" : "bg-red-500"
          }`}
        ></div>
        <span className="text-sm">
          {listening ? "Mendengarkan..." : "Tidak Mendengarkan"}
        </span>
      </div>

      <div className="text-white text-xs text-center mt-2 opacity-70">
        Katakan "{userData?.assistantName}" untuk memulai perintah suara
      </div>

      {/* Test Manual Command */}
      <div className="mt-2 w-full max-w-md">
        <input
          type="text"
          value={testCommand}
          onChange={(e) => setTestCommand(e.target.value)}
          placeholder="Berikan perintah manual..."
          className="w-full px-3 py-2 rounded-lg text-white bg-[#00000060]"
          onKeyDown={(e) => e.key === "Enter" && handleTestCommand()}
        />
        <button
          onClick={handleTestCommand}
          className="w-full mt-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
        >
          Perintah Manual
        </button>
      </div>
    </div>
  );
}

export default Home;
