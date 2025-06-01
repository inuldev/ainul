import { useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { RiImageAddLine } from "react-icons/ri";
import { MdKeyboardBackspace } from "react-icons/md";

import Card from "../components/Card";
import image1 from "../assets/image1.png";
import image2 from "../assets/image2.jpg";
import image3 from "../assets/authBg.jpg";
import image4 from "../assets/image4.jpg";
import image5 from "../assets/image5.png";
import image6 from "../assets/image6.jpeg";
import image7 from "../assets/image7.jpg";
import { userDataContext } from "../context/UserContext";

function Customize() {
  const inputImage = useRef();
  const navigate = useNavigate();
  const {
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
  } = useContext(userDataContext);

  const handleImage = (e) => {
    const file = e.target.files[0];
    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
  };

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[#000000] to-[#030353] flex justify-center items-center flex-col p-[20px] relative">
      <MdKeyboardBackspace
        className="absolute top-[30px] left-[30px] w-[30px] h-[30px] text-white cursor-pointer"
        onClick={() => navigate("/")}
      />
      <h1 className="text-white mb-[30px] text-[30px] text-center font-semibold">
        Pilih profil <span className="text-blue-300">Asisten Virtual</span>
      </h1>
      <div className="w-[90%] max-w-[60%] flex justify-center items-center flex-wrap gap-[15px]">
        <Card image={image1} />
        <Card image={image2} />
        <Card image={image3} />
        <Card image={image4} />
        <Card image={image5} />
        <Card image={image6} />
        <Card image={image7} />
        <div
          className={`lg:w-[130px] lg:h-[210px] w-[70px] h-[130px] bg-[#020220] border-2 border-[#0000ff66] rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-950 hover:border-blue-400 hover:border-4 cursor-pointer transition-all flex items-center justify-center ${
            selectedImage === "input"
              ? "border-4 border-blue-400 shadow-2xl shadow-blue-950"
              : null
          }`}
          onClick={() => {
            inputImage.current.click();
            setSelectedImage("input");
          }}
        >
          {!frontendImage && (
            <RiImageAddLine className="text-white w-[25px] h-[25px]" />
          )}
          {frontendImage && (
            <img src={frontendImage} alt="" className="h-full object-cover" />
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={inputImage}
          hidden
          onChange={handleImage}
        />
      </div>
      {selectedImage && (
        <button
          className="min-w-[120px] h-[40px] mt-[30px] bg-blue-400 text-white font-semibold rounded-full text-[16px] hover:bg-blue-500 transition-colors cursor-pointer"
          onClick={() => navigate("/customize2")}
        >
          Lanjut
        </button>
      )}
    </div>
  );
}

export default Customize;
