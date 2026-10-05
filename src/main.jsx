import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import BandeauCookies from "./MetaPixel.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <BandeauCookies />
  </React.StrictMode>
);
