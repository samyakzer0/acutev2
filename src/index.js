// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

const requestAccount = async () => {
    const { ethereum } = window;
    if (!ethereum) {
        alert("Please install MetaMask!");
        return;
    }

    try {
        await ethereum.request({ method: "eth_requestAccounts" });
        root.render(<App />);
    } catch (error) {
        console.error("User denied account access:", error);
    }
};

requestAccount();
