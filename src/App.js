"use client"

import { useState, useEffect } from "react"
import Spline from "@splinetool/react-spline"
import { motion } from "framer-motion"
import { Shield, Image, Lock, Send, FileUp, FileDown, Camera, Download, Home, Wallet, LogOut } from "lucide-react"
import "./App.css"
import { BrowserProvider } from "ethers"
import Footer from "./Footer"
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom"
import SendPhotoPage from "./SendPhoto"
import RetrievePhotoPage from "./RetrievePhoto"

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showOptions, setShowOptions] = useState(false) // Toggle menu state
  const [walletAddress, setWalletAddress] = useState(null)

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && menuOpen) {
        setMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [menuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [menuOpen])

  // 🏆 Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install MetaMask.")
      return
    }

    try {
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setWalletAddress(address)
      setShowOptions(false) // Hide options after connecting
      console.log("✅ Connected Wallet:", address)
    } catch (error) {
      console.error("❌ Wallet connection failed:", error)
      alert("Failed to connect wallet. Please try again.")
    }
  }

  // 🔌 Disconnect Wallet
  const disconnectWallet = () => {
    setWalletAddress(null)
    setShowOptions(false)
    console.log("❌ Disconnected Wallet")
  }

  const toggleMobileMenu = () => {
    setMenuOpen(!menuOpen)
  }

  return (
    <Router>
      <div className="app-container">
        {/* Background Elements */}
        <div className="background-elements">
          <div className="bg-purple" />
          <div className="bg-blue" />
          <div className="bg-center" />
        </div>
        <div className="container">
          <nav className="nav-bar">
            {/* Logo */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="logo-container">
              <Link to="/" className="logo-link">
                <img src="/icon.png" alt="Acute Logo" className="logo-icon" />
              </Link>
            </motion.div>

            {/* Desktop Navigation Links */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="nav-links">
              <Link to="/" className="nav-button">
                <Home size={20} />
                <span>Home</span>
              </Link>
              <Link to="/send-photo" className="nav-button">
                <Camera size={20} />
                <span>Send File</span>
              </Link>
              <Link to="/retrieve-photo" className="nav-button">
                <Download size={20} />
                <span>Retrieve File</span>
              </Link>
            </motion.div>

            {/* Wallet Button */}
            <div className="wallet-container">
              <button className="wallet-button" onClick={() => setShowOptions(!showOptions)}>
                <Wallet size={24} />
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect"}
              </button>

              {/* Wallet Options Dropdown */}
              {showOptions && (
                <div className="wallet-options glass-effect">
                  {walletAddress ? (
                    <>
                      <p className="wallet-address">{walletAddress}</p>
                      <button className="disconnect-button" onClick={disconnectWallet}>
                        <LogOut size={16} />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button className="connect-button" onClick={connectWallet}>
                      <Wallet size={16} />
                      Connect Wallet
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Hamburger Menu Button */}
            <div className={`hamburger-menu ${menuOpen ? "open" : ""}`} onClick={toggleMobileMenu}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </nav>

          {/* Mobile Menu Overlay */}
          <div className={`mobile-menu-overlay ${menuOpen ? "open" : ""}`} onClick={toggleMobileMenu}></div>

          {/* Mobile Menu */}
          <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
            <div className="mobile-nav-links">
              <Link to="/" onClick={() => setMenuOpen(false)}>
                <Home size={20} className="mr-2" />
                Home
              </Link>
              <Link to="/send-photo" onClick={() => setMenuOpen(false)}>
                <Camera size={20} className="mr-2" />
                Send File
              </Link>
              <Link to="/retrieve-photo" onClick={() => setMenuOpen(false)}>
                <Download size={20} className="mr-2" />
                Retrieve File
              </Link>
              {!walletAddress ? (
                <button
                  className="mobile-wallet-button"
                  onClick={() => {
                    connectWallet()
                    setMenuOpen(false)
                  }}
                >
                  <Wallet size={20} className="mr-2" />
                  Connect Wallet
                </button>
              ) : (
                <div className="mobile-wallet-info">
                  <p className="mobile-wallet-address">
                    <Wallet size={16} className="mr-2" />
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                  <button
                    className="mobile-disconnect-button"
                    onClick={() => {
                      disconnectWallet()
                      setMenuOpen(false)
                    }}
                  >
                    <LogOut size={16} className="mr-2" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="content-wrapper">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/send-photo" element={<SendPhotoPage />} />
            <Route path="/retrieve-photo" element={<RetrievePhotoPage />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </Router>
  )
}

function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <div className="hero-section">
        {/* Spline Object Container */}
        <div className="spline-container">
          <Spline scene="https://prod.spline.design/i8BWWbD-qVzHA2DO/scene.splinecode" />
        </div>

        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="hero-content"
          >
            <div className="tag">Powered by Web3 Technology</div>

            <h2 className="hero-title">Seamless File Transfer with Web3</h2>

            <p className="hero-description">
              Securely share your files using blockchain technology and IPFS storage. End-to-end encryption ensures your
              belongings remain private and accessible.
            </p>

            <div className="button-group">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="send-button"
                onClick={() => (window.location.href = "/send-photo")}
              >
                <FileUp className="icon" />
                <span>Send Files</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="retrieve-button"
                onClick={() => (window.location.href = "/retrieve-photo")}
              >
                <FileDown className="icon" />
                <span>Retrieve Files</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="features-grid"
        >
          {[
            {
              icon: Shield,
              title: "Secure Transfer",
              description: "End-to-end encrypted photo sharing using blockchain technology",
            },
            {
              icon: Image,
              title: "IPFS Storage",
              description: "Decentralized storage ensuring your photos are always accessible",
            },
            { icon: Lock, title: "Smart Contracts", description: "Ethereum-based contracts managing access control" },
            { icon: Send, title: "Easy Sharing", description: "User-friendly interface for seamless photo sharing" },
          ].map((feature, index) => (
            <motion.div key={index} whileHover={{ scale: 1.02, y: -5 }} className="feature-card">
              <feature.icon className="feature-icon" />
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  )
}

export default App

