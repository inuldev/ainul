import { useContext } from "react";

import { UserDataContext } from "../context/userDataContext.js";

function Card({ image }) {
  const { selectedImage, setSelectedImage, setBackendImage, setFrontendImage } =
    useContext(UserDataContext);

  return (
    <div
      className={`lg:w-[130px] lg:h-[210px] w-[70px] h-[130px] bg-[#020220] border-2 border-[#0000ff66] rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-950 hover:border-blue-400 hover:border-4 cursor-pointer transition-all ${
        selectedImage === image
          ? "border-4 border-blue-400 shadow-2xl shadow-blue-950"
          : null
      }`}
      onClick={() => {
        setSelectedImage(image);
        setBackendImage(null);
        setFrontendImage(null);
      }}
    >
      <img src={image} alt="" className="h-full object-cover" />
    </div>
  );
}

export default Card;
