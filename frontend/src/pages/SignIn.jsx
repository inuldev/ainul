import axios from "axios";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { IoEye, IoEyeOff } from "react-icons/io5";

import bg from "../assets/authBg.png";
import { userDataContext } from "../context/UserContext";

function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const { serverUrl, setUserData } = useContext(userDataContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result = await axios.post(
        `${serverUrl}/api/auth/signin`,
        {
          email,
          password,
        },
        { withCredentials: true }
      );
      setUserData(result.data);
      setLoading(false);
      navigate("/");
    } catch (error) {
      setUserData(null);
      setLoading(false);
      setError(error.response.data.message);
    }
  };

  return (
    <div
      className="w-full h-[100vh] bg-cover flex justify-center items-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <form
        onSubmit={handleSignIn}
        className="w-[90%] h-[600px] max-w-[500px] bg-[#00000060] backdrop-blur shadow-lg shadow-black rounded-md flex flex-col items-center justify-center gap-[20px] px-[20px]"
      >
        <h1 className="text-white text-[30px] font-semibold mb-[30px]">
          AInul ~ <span className="text-blue-400">Asisten Virtual</span>
        </h1>
        <input
          type="email"
          placeholder="Email"
          className="w-full h-[60px] outline-none border-2 border-white bg-transparent text-white placeholder-gray-400 px-[20px] py-[10px] rounded-full text-[18px]"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="w-full h-[60px] border-2 border-white bg-transparent text-white rounded-full text-[18px] relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full h-full rounded-full outline-none bg-transparent placeholder-gray-400 px-[20px] py-[10px]"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!showPassword && (
            <IoEye
              className="absolute top-[18px] right-[20px] w-[25px] h-[25px] text-[white] cursor-pointer hover:text-blue-400 transition-colors"
              onClick={() => setShowPassword(true)}
            />
          )}
          {showPassword && (
            <IoEyeOff
              className="absolute top-[18px] right-[20px] w-[25px] h-[25px] text-[white] cursor-pointer hover:text-blue-400 transition-colors"
              onClick={() => setShowPassword(false)}
            />
          )}
        </div>
        {error.length > 0 && (
          <p className="text-red-500 text-[16px]">{error}</p>
        )}
        <button
          type="submit"
          className="min-w-[150px] h-[60px] mt-[30px] bg-blue-400 text-white font-semibold rounded-full text-[18px] hover:bg-blue-500 transition-colors cursor-pointer"
          disabled={loading}
        >
          {loading ? "Memuat..." : "Masuk"}
        </button>
        <p
          className="text-white text-[16px]"
          onClick={() => navigate("/signup")}
        >
          Belum punya akun?{" "}
          <span className="text-blue-400 hover:underline cursor-pointer">
            Daftar
          </span>
        </p>
      </form>
    </div>
  );
}

export default SignIn;
