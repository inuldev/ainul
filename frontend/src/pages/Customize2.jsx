import axios from "axios";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { MdKeyboardBackspace } from "react-icons/md";

import { userDataContext } from "../context/UserContext";

function Customize2() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { userData, backendImage, selectedImage, serverUrl, setUserData } =
    useContext(userDataContext);

  const [assistantName, setAssistantName] = useState(
    userData?.assistantName || ""
  );

  const handleUpdateAssistant = async () => {
    setLoading(true);
    try {
      let formData = new FormData();
      formData.append("assistantName", assistantName);
      if (backendImage) {
        formData.append("assistantImage", backendImage);
      } else {
        formData.append("imageUrl", selectedImage);
      }

      const result = await axios.post(
        `${serverUrl}/api/user/update`,
        formData,
        {
          withCredentials: true,
        }
      );
      console.log(result.data);
      setUserData(result.data.user);
      setLoading(false);
      navigate("/");
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[#000000] to-[#030353] flex justify-center items-center flex-col p-[20px] relative">
      <MdKeyboardBackspace
        className="absolute top-[30px] left-[30px] w-[30px] h-[30px] text-white cursor-pointer"
        onClick={() => navigate("/customize")}
      />
      <h1 className="text-white mb-[40px] text-[30px] text-center font-semibold">
        Berikan nama <span className="text-blue-300">Asisten Virtual</span>
      </h1>
      <input
        type="text"
        placeholder="contoh nama: ainul"
        className="w-full max-w-[600px] h-[60px] outline-none border-2 border-white bg-transparent text-white placeholder-gray-400 px-[20px] py-[10px] rounded-full text-[18px]"
        required
        value={assistantName}
        onChange={(e) => setAssistantName(e.target.value)}
      />
      {assistantName && (
        <button
          className="min-w-[120px] h-[40px] mt-[30px] bg-blue-400 text-white font-semibold rounded-full text-[16px] hover:bg-blue-500 transition-colors cursor-pointer"
          disabled={loading}
          onClick={() => {
            handleUpdateAssistant();
          }}
        >
          {loading ? "Memuat..." : "Simpan"}
        </button>
      )}
    </div>
  );
}

export default Customize2;
