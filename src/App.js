"use client"

import { useState, useEffect } from "react"
import Spline from "@splinetool/react-spline"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Image, Lock, Send, FileUp, FileDown, Camera, Download, Home, Wallet, LogOut, Menu, X } from "lucide-react"
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
  const [gridCells, setGridCells] = useState([])

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

  // Light ray effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const lightRay = document.querySelector('.light-ray')
      if (!lightRay) return

      lightRay.style.left = `${e.clientX}px`
      lightRay.style.top = `${e.clientY}px`
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Remove the grid cells effect
  useEffect(() => {
    const createGrid = () => {
      const container = document.querySelector('.grid-background')
      if (!container) return
    }

    createGrid()
    window.addEventListener('resize', createGrid)
    return () => window.removeEventListener('resize', createGrid)
  }, [])

  // 🏆 Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install MetaMask.");
      return;
    }
  
    try {
      // Detect mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
      if (isMobile) {
        // Redirect to MetaMask mobile app using deep linking
        window.location.href = `https://metamask.app.link/dapp/${encodeURIComponent(window.location.href)}`;
        return;
      }
  
      // Request wallet connection for desktop users
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  
      if (!accounts.length) {
        throw new Error("No accounts found. Please connect your wallet.");
      }
  
      // Use ethers.js to fetch address
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
  
      setWalletAddress(address);
      setShowOptions(false);
      console.log("✅ Connected Wallet:", address);
    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
  
      if (error.code === -32603) {
        alert("MetaMask encountered an internal error. Try restarting the app.");
      } else if (error.code === 4001) {
        alert("You rejected the connection request.");
      } else {
        alert("Failed to connect wallet. Please try again.");
      }
    }
  };
  
  
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
        <motion.div 
          className="background-elements"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="grid-background" />
          <motion.div 
            className="bg-purple"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="bg-blue"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
          <motion.div 
            className="bg-center"
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        <div className="container">
          <motion.nav 
            className="nav-bar"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="logo-container"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/" className="logo-link">
                <img src="/icon.png" alt="Acute Logo" className="logo-icon" />
              </Link>
            </motion.div>

            {/* Desktop Navigation Links */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="nav-links"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/" className="nav-button">
                  <Home size={20} />
                  <span>Home</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/send-photo" className="nav-button">
                  <Camera size={20} />
                  <span>Send File</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/retrieve-photo" className="nav-button">
                  <Download size={20} />
                  <span>Retrieve File</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Wallet Button */}
            <motion.div 
              className="wallet-container"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <button className="wallet-button" onClick={() => setShowOptions(!showOptions)}>
                <Wallet size={24} />
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect"}
              </button>

              {/* Wallet Options Dropdown */}
              <AnimatePresence>
                {showOptions && (
                  <motion.div 
                    className="wallet-options glass-effect"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {walletAddress ? (
                      <>
                        <p className="wallet-address">{walletAddress}</p>
                        <motion.button 
                          className="disconnect-button"
                          onClick={disconnectWallet}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <LogOut size={16} />
                          Disconnect
                        </motion.button>
                      </>
                    ) : (
                      <motion.button 
                        className="connect-button"
                        onClick={connectWallet}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Wallet size={16} />
                        Connect Wallet
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Hamburger Menu Button */}
            <motion.div 
              className={`hamburger-menu ${menuOpen ? "open" : ""}`} 
              onClick={toggleMobileMenu}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.div>
          </motion.nav>

          {/* Mobile Menu Overlay */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div 
                className={`mobile-menu-overlay ${menuOpen ? "open" : ""}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleMobileMenu}
              />
            )}
          </AnimatePresence>

          {/* Mobile Menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div 
                className={`mobile-menu ${menuOpen ? "open" : ""}`}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 20 }}
              >
                <div className="mobile-nav-links">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link to="/" onClick={() => setMenuOpen(false)}>
                      <Home size={20} className="mr-2" />
                      Home
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link to="/send-photo" onClick={() => setMenuOpen(false)}>
                      <Camera size={20} className="mr-2" />
                      Send File
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link to="/retrieve-photo" onClick={() => setMenuOpen(false)}>
                      <Download size={20} className="mr-2" />
                      Retrieve File
                    </Link>
                  </motion.div>
                  {!walletAddress ? (
                    <motion.button
                      className="mobile-wallet-button"
                      onClick={() => {
                        connectWallet()
                        setMenuOpen(false)
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Wallet size={20} className="mr-2" />
                      Connect Wallet
                    </motion.button>
                  ) : (
                    <motion.div 
                      className="mobile-wallet-info"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p className="mobile-wallet-address">
                        <Wallet size={16} className="mr-2" />
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </p>
                      <motion.button
                        className="mobile-disconnect-button"
                        onClick={() => {
                          disconnectWallet()
                          setMenuOpen(false)
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <LogOut size={16} className="mr-2" />
                        Disconnect
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
        <motion.div 
          className="spline-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
        </motion.div>

        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="hero-content"
          >
            <motion.div 
              className="tag"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Powered by Web3 Technology
            </motion.div>

            <motion.h2 
              className="hero-title"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Seamless File Transfer with Web3
            </motion.h2>

            <motion.p 
              className="hero-description"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Securely share your files using blockchain technology and IPFS storage. End-to-end encryption ensures your
              belongings remain private and accessible.
            </motion.p>

            <motion.div 
              className="button-group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="send-button"
                onClick={() => (window.location.href = "/send-photo")}
              >
                <FileUp className="icon" />
                <span>Send Files</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="retrieve-button"
                onClick={() => (window.location.href = "/retrieve-photo")}
              >
                <FileDown className="icon" />
                <span>Retrieve Files</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <motion.div 
        className="features-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="features-grid">
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
            { 
              icon: Lock, 
              title: "Smart Contracts", 
              description: "Ethereum-based contracts managing access control" 
            },
            { 
              icon: Send, 
              title: "Easy Sharing", 
              description: "User-friendly interface for seamless photo sharing" 
            },
          ].map((feature, index) => (
            <motion.div 
              key={index} 
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <feature.icon className="feature-icon" />
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </>
  )
}

export default App

