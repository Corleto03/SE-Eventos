import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // 👈 Ruta corregida (sin ../styles/)
import logo from "../assets/logo.png";

export default function Register() {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  // Validaciones
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }

    if (!formData.correo) {
      newErrors.correo = "El correo es requerido";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.correo)) {
        newErrors.correo = "Por favor ingresa un correo válido";
      }
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/"); // Redirigir al login después del registro
        }, 2000);
      } else {
        setErrorMsg(data.error || "Error al registrar usuario");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMsg("Error conectando al servidor");
    } finally {
      setLoading(false);
    }
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
              <h1>Crear cuenta</h1>
              <p>Completa los datos para registrarte</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className={`form-group ${errors.nombre ? "error" : ""}`}>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Nombre completo"
                  required
                />
                <label htmlFor="nombre">Nombre</label>
                <div className={`error-message ${errors.nombre ? "show" : ""}`}>
                  {errors.nombre}
                </div>
              </div>

              <div className={`form-group ${errors.correo ? "error" : ""}`}>
                <input
                  type="email"
                  id="correo"
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  required
                />
                <label htmlFor="correo">Correo</label>
                <div className={`error-message ${errors.correo ? "show" : ""}`}>
                  {errors.correo}
                </div>
              </div>

              <div className={`form-group ${errors.password ? "error" : ""}`}>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Contraseña"
                  required
                />
                <label htmlFor="password">Contraseña</label>
                <div className={`error-message ${errors.password ? "show" : ""}`}>
                  {errors.password}
                </div>
              </div>

              <button 
                type="submit" 
                className={`login-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                <span className="btn-text">
                  {loading ? "Registrando..." : "Registrarse"}
                </span>
              </button>
            </form>

            {errorMsg && (
              <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            <div className="signup-link">
              <p>
                ¿Ya tienes cuenta?{" "}
                <a href="/" className="signup-link-text">
                  Inicia sesión aquí
                </a>
              </p>
            </div>
          </>
        ) : (
          <div className="success-message show">
            <div className="success-icon">✅</div>
            <h3>¡Cuenta creada exitosamente!</h3>
            <p>Redirigiendo al login...</p>
          </div>
        )}
      </div>
    </div>
  );
}