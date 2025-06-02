import bcrypt from "bcryptjs";

import genToken from "../config/token.js";
import User from "../models/user.model.js";

// Helper function for consistent cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production", // true for HTTPS
});

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password harus diisi!",
      });
    }

    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar!",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password tidak boleh kurang dari 6 karakter",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = await genToken(user._id);

    res.cookie("token", token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: "Pengguna berhasil didaftarkan!",
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat registrasi",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password harus diisi!",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email atau password salah!",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Email atau password salah!",
      });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: "Login berhasil!",
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat login",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear cookie with same options as when it was set
    const { maxAge, ...clearOptions } = getCookieOptions();
    res.clearCookie("token", clearOptions);

    return res.status(200).json({
      success: true,
      message: "Logout berhasil!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
