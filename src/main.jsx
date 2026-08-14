import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Feekah from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Feekah />
  </React.StrictMode>
);
