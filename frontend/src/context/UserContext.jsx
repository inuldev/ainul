import axios from "axios";
import { useEffect, useState } from "react";

import { UserDataContext } from "./userDataContext.js";

function UserContext({ children }) {
  // Auto-detect environment and set appropriate server URL
  const getServerUrl = () => {
    // Check if we're in development mode
    if (import.meta.env.DEV || window.location.hostname === "localhost") {
      return "http://localhost:8000";
    }

    // Production mode - use environment variable or default to your Vercel backend
    return import.meta.env.VITE_API_URL || "https://ainul-api.vercel.app";
  };

  const serverUrl = getServerUrl();
  const [userData, setUserData] = useState(null);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleCurrentUser = async () => {
    try {
      let result = await axios.get(`${serverUrl}/api/user/current`, {
        withCredentials: true,
      });
      setUserData(result.data.user);
    } catch (error) {
      console.log(error);
    }
  };

  const getGeminiResponse = async (command) => {
    try {
      let result = await axios.post(
        `${serverUrl}/api/user/asktoassistant`,
        {
          command,
        },
        {
          withCredentials: true,
        }
      );
      return result.data;
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    handleCurrentUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
    getGeminiResponse,
  };

  return (
    <div>
      <UserDataContext.Provider value={value}>
        {children}
      </UserDataContext.Provider>
    </div>
  );
}

export default UserContext;
