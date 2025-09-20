import express from "express";
import mysql from 'mysql2/promise';
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";

import crypto from "crypto"; 
import { OAuth2Client } from "google-auth-library"; 
import { spawn } from "child_process";

dotenv.config(); // Esto carga las variables de entorno del backend (.env en la raíz de tu backend)

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// ====== CONEXIÓN MYSQL CON POOL ======
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar conexión
try {
  const connection = await db.getConnection();
  console.log("✅ Conectado a MySQL");
  connection.release();
} catch (err) {
  console.error("❌ Error conectando a la base de datos:", err);
}

// ====== CLIENTE GOOGLE ======
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ====== LOGIN LOCAL ======
app.post("/login", async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) return res.status(400).json({ msg: "Correo y contraseña requeridos" });

  try {
    // Buscar usuario (sin filtro de proveedor para incluir usuarios registrados localmente)
    const sql = "SELECT * FROM usuarios WHERE correo = ?";
    const [results] = await db.query(sql, [correo]);
    
    if (results.length === 0) return res.status(401).json({ msg: "Usuario no encontrado" });

    const user = results[0];
    
    // Si es usuario de Google, no tiene password_hash
    if (user.proveedor === 'google') {
      return res.status(401).json({ msg: "Este usuario se registró con Google. Usa el botón de Google para iniciar sesión." });
    }
    
    // Verificar contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) return res.status(401).json({ msg: "Contraseña incorrecta" });

    res.json({
      msg: "Login correcto",
      user: { id: user.id, nombre: user.nombre, correo: user.correo, proveedor: user.proveedor }
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ msg: "Error en servidor", error: err.message });
  }
});

// ====== LOGIN GOOGLE ======
app.post("/auth/google", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ msg: "Token no proporcionado" });

  try {
    const ticket = await client.verifyIdToken({ 
      idToken: token, 
      audience: process.env.GOOGLE_CLIENT_ID 
    });
    const payload = ticket.getPayload();
    const correo = payload.email;
    const nombre = payload.name;

    const sql = "SELECT * FROM usuarios WHERE correo = ?";
    const [results] = await db.query(sql, [correo]);

    if (results.length > 0) {
      return res.json({ msg: "Login con Google correcto", user: results[0] });
    } else {
      const insertSql = "INSERT INTO usuarios(nombre, correo, proveedor, password_hash) VALUES(?, ?, 'google', NULL)";
      const [result] = await db.query(insertSql, [nombre, correo]);
      
      const [newUser] = await db.query("SELECT * FROM usuarios WHERE id = ?", [result.insertId]);
      res.json({ msg: "Usuario creado con Google", user: newUser[0] });
    }
  } catch (err) {
    console.error("Error verificando token de Google:", err);
    res.status(401).json({ msg: "Token inválido o expirado" });
  }
});

// ====== REGISTRO DE USUARIOS (SAMUEL) ======
app.post("/api/usuarios", async (req, res) => {
  const { nombre, correo, password } = req.body;
  
  // Validar datos
  if (!nombre || !correo || !password) {
    return res.status(400).json({ 
      success: false, 
      error: "Todos los campos son requeridos" 
    });
  }

  try {
    // Verificar si el usuario ya existe
    const [existingUser] = await db.query(
      "SELECT id FROM usuarios WHERE correo = ?", 
      [correo]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Este correo ya está registrado" 
      });
    }

    // Encriptar la contraseña con bcrypt (más seguro que SHA256)
    const password_hash = await bcrypt.hash(password, 10);

    // Llamar al SP - Si tu SP no maneja el proveedor, usa INSERT directo
    // await db.query("CALL sp_insert_user(?, ?, ?)", [nombre, correo, password_hash]);
    
    // O usa INSERT directo para asegurar que se marque como 'local'
    await db.query(
      "INSERT INTO usuarios (nombre, correo, password_hash, proveedor) VALUES (?, ?, ?, 'local')",
      [nombre, correo, password_hash]
    );

    res.json({ 
      success: true, 
      message: "Usuario registrado correctamente" 
    });
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ====== GUARDAR RESPUESTAS Y OBTENER RECOMENDACIÓN ======
app.post("/chat", async (req, res) => {
  const r = req.body;
  if (!r) return res.status(400).json({ msg: "No se recibieron respuestas" });

  try {
    // Guardar con Stored Procedure
    const sql = "CALL GuardarRespuestas(?, ?, ?, ?, ?, ?, ?, ?, ?)";
    await db.query(sql, [
      r.userId || null,
      r.tipo_evento,
      r.invitados,
      parseFloat(r.presupuesto) || 0,
      r.lugar,
      r.horario,
      r.comida,
      r.musica,
      r.decoracion
    ]);

    console.log("✅ Respuestas guardadas con éxito");

    // ===== Ejecutar modelo de TensorFlow (Python) =====
    const python = spawn("python", ["./ML/predict.py", JSON.stringify(r)]);
    
    let resultado = "";
    let errorPython = "";

    python.stdout.on("data", (data) => {
      resultado += data.toString();
    });

    python.stderr.on("data", (error) => {
      errorPython += error.toString();
      console.error("Error en Python:", error.toString());
    });

    python.on("close", (code) => {
      if (code !== 0) {
        console.error("Python terminó con código:", code);
        console.error("Error Python completo:", errorPython);
        return res.status(500).json({
          msg: "Error procesando la predicción",
          error: errorPython
        });
      }

      try {
        // Parsear la respuesta de Python
        const pythonResponse = JSON.parse(resultado.trim());
        
        // Tu predict.py devuelve: prediccion, msg, recomendacion, presupuesto_suficiente, diferencia
        if (pythonResponse.msg && pythonResponse.recomendacion) {
          res.json({
            msg: pythonResponse.msg,
            recomendacion: pythonResponse.recomendacion,
            prediccion: pythonResponse.prediccion,
            presupuesto_suficiente: pythonResponse.presupuesto_suficiente,
            diferencia: pythonResponse.diferencia,
            success: true
          });
        } else {
          // Fallback si el formato no es el esperado
          res.json({
            msg: "Análisis completado",
            recomendacion: "No se pudo generar recomendación",
            success: false
          });
        }  
      } catch (parseError) {
        console.error("Error parseando respuesta de Python:", parseError);
        console.error("Resultado recibido:", resultado);
        
        res.json({
          msg: "Respuestas guardadas con éxito",
          recomendacion: "Error al procesar la recomendación: " + parseError.message,
          success: false
        });
      }
    });

    python.on("error", (error) => {
      console.error("Error ejecutando Python:", error);
      res.status(500).json({
        msg: "Error ejecutando el análisis",
        error: error.message
      });
    });
    
  } catch (err) {
    console.error("Error guardando respuestas:", err);
    return res.status(500).json({ msg: "Error guardando respuestas", error: err.message });
  }
});

// ===== SERVIDOR =====
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));