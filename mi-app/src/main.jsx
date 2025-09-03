import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="703662483056-3us3gqd8vl8ttpkdkjta3q7i20da4p30.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
