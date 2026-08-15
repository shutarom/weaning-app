import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
// index.css は長らくどこからも import されておらず、フォント指定・body のリセット・
// box-sizing: border-box が一切ビルドに含まれていなかった（Android で表示が崩れる原因）。
import "./index.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
