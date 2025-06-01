import axios from "axios";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import { userDataContext } from "../context/UserContext";

function Home() {
  const navigate = useNavigate();
  const { userData, serverUrl, setUserData } = useContext(userDataContext);

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
