import axios from "axios";
import { useEffect, useState } from "react";

import { UserDataContext } from "./userDataContext.js";

function UserContext({ children }) {
  const serverUrl = "http://localhost:8000";
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
  }, []);

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
