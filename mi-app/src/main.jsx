import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";

// Tomamos el clientId del .env de React
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={clientId}>
    <App />
  </GoogleOAuthProvider>
);
