import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "./Login.css";
import logo from "../assets/logo.png";

// Componente para botón de Google personalizado
function GoogleButton({ onSuccess, onError }) {
  return (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      useOneTap
      render={(renderProps) => (
        <button
          type="button"
          onClick={renderProps.onClick}
          disabled={renderProps.disabled}
          className="google-btn"
        >
          <svg
            className="google-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="24px"
            height="24px"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.66 1.21 9.13 3.21l6.82-6.82C35.46 2.62 30.1 0 24 0 14.84 0 6.84 5.64 3.36 13.5l7.95 6.18C13.64 14.1 18.46 9.5 24 9.5z"
            />
            <path
              fill="#34A853"
              d="M46.5 24c0-1.54-.12-2.7-.31-3.88H24v7.35h12.78c-.56 2.88-2.25 5.34-4.78 6.98l7.35 5.73C44.12 37.38 46.5 31.06 46.5 24z"
            />
            <path
              fill="#4A90E2"
              d="M10.92 28.43l-7.95 6.18C5.64 42.36 14.84 48 24 48c6.17 0 11.64-2.04 15.9-5.53l-7.35-5.73c-2.01 1.34-4.52 2.13-7.55 2.13-5.54 0-10.36-4.6-11.08-10.52z"
            />
            <path
              fill="#FBBC05"
              d="M3.36 13.5l7.95 6.18c.61-5.92 5.53-10.52 11.08-10.52 3.03 0 5.54.79 7.55 2.13l7.35-5.73C35.64 2.04 30.17 0 24 0 14.84 0 6.84 5.64 3.36 13.5z"
            />
          </svg>
          <span>Inicia sesión con Google</span>
        </button>
      )}
    />
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  // Validaciones
  const validateEmail = () => {
    if (!email) {
      setErrors(prev => ({ ...prev, email: "Email address is required" }));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      return false;
    }
    setErrors(prev => ({ ...prev, email: "" }));
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setErrors(prev => ({ ...prev, password: "Password is required" }));
      return false;
    }
    if (password.length < 5) {
      setErrors(prev => ({ ...prev, password: "Password must be at least 6 characters long" }));
      return false;
    }
    setErrors(prev => ({ ...prev, password: "" }));
    return true;
  };

  // Login local
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/chat", { state: { user: data.user } }), 1500);
      } else {
        setErrorMsg(data.msg || "Sign in failed");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  // Login con Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = credentialResponse.credential;
      const res = await fetch("http://localhost:5000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/chat", { state: { user: data.user } }), 1500);
      } else {
        setErrorMsg(data.msg || "Error en Google Login");
      }
    } catch (err) {
      console.error("Google login error:", err);
      setErrorMsg("Error conectando al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMsg("Fallo en login con Google");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {!success ? (
          <>
            <div className="login-header">
              <div className="logo">
                <img src={logo} alt="Logo" className="logo-image" />
              </div>
              <h1>Bienvenido!</h1>
              <p>Listo para planear tu próximo gran evento</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className={`form-group ${errors.email ? "error" : ""}`}>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={validateEmail}
                  placeholder="Email address"
                />
                <label htmlFor="email">Correo electronico</label>
                <div className={`error-message ${errors.email ? "show" : ""}`}>
                  {errors.email}
                </div>
              </div>

              <div className={`form-group with-toggle ${errors.password ? "error" : ""}`}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={validatePassword}
                  placeholder="Password"
                />
                <label htmlFor="password">Contraseña</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <svg className="eye-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 3C4.5 3 1.05 6.21 0.5 9c.55 2.79 4 6 8.5 6s7.95-3.21 8.5-6c-.55-2.79-4-6-8.5-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="currentColor"/>
                  </svg>
                </button>
                <div className={`error-message ${errors.password ? "show" : ""}`}>
                  {errors.password}
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input type="checkbox" id="remember" />
                  <span className="checkmark">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Mantén la sesión iniciada
                </label>
              </div>

              <button type="submit" className={`login-btn ${loading ? "loading" : ""}`} disabled={loading}>
                <span className="btn-text">{loading ? "Signing In..." : "Ingresar"}</span>
              </button>
            </form>

            <div className="signup-link">
             <p>
            ¿No tienes cuenta?{" "}
            <a href="/register" className="signup-link-text">
              ¡Regístrate!
            </a>
        </p>
          </div>

            <div className="social-section">
              <div className="divider">
                <span>O inicia sesión con</span>
             </div>

            <div className="social-login">
             <GoogleButton
               onSuccess={handleGoogleSuccess}
               onError={handleGoogleError}
              />
            </div>
          </div>


            {errorMsg && <p style={{ color: "red", marginTop: "10px" }}>{errorMsg}</p>}

            <div className="signup-link">
            </div>
          </>
        ) : (
          <div className="success-message show">
            <div className="success-icon">✅</div>
            <h3>Iniciaste sesión exitosamente</h3>
            <p>Redirigienod hacia el chat...</p>
          </div>
        )}
      </div>
    </div>
  );
}
