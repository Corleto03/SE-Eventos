import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto"; 
import { OAuth2Client } from "google-auth-library"; 
import { spawn } from "child_process";

dotenv.config(); // Esto carga las variables de entorno del backend (.env en la raíz de tu backend)

const app = express();
app.use(cors());
app.use(express.json());

// ====== CONEXIÓN MYSQL ======
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect(err => { 
  if (err) throw err; 
  console.log("Conectado a MySQL"); 
});

// ====== CLIENTE GOOGLE ======
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); //  usar GOOGLE_CLIENT_ID, no VITE_GOOGLE_CLIENT_ID

// ====== LOGIN LOCAL ======
app.post("/login", (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) return res.status(400).json({ msg: "Correo y contraseña requeridos" });

  const sql = "SELECT * FROM usuarios WHERE correo = ? AND proveedor = 'local'";
  db.query(sql, [correo], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(401).json({ msg: "Usuario no encontrado" });

    const user = results[0];
    const hash = crypto.createHash("sha256").update(password).digest("hex");

    if (hash !== user.password_hash) return res.status(401).json({ msg: "Contraseña incorrecta" });

    res.json({
      msg: "Login correcto",
      user: { id: user.id, nombre: user.nombre, correo: user.correo, proveedor: user.proveedor }
    });
  });
});

// ====== LOGIN GOOGLE ======
app.post("/auth/google", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ msg: "Token no proporcionado" });

  try {
    // ✅ Aquí también usar GOOGLE_CLIENT_ID
    const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const correo = payload.email;
    const nombre = payload.name;

    const sql = "SELECT * FROM usuarios WHERE correo = ?";
    db.query(sql, [correo], (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.length > 0) {
        return res.json({ msg: "Login con Google correcto", user: results[0] });
      } else {
        const insertSql = "INSERT INTO usuarios(nombre, correo, proveedor, password_hash) VALUES(?, ?, 'google', NULL)";
        db.query(insertSql, [nombre, correo], (err, result) => {
          if (err) return res.status(500).json(err);
          db.query("SELECT * FROM usuarios WHERE id = ?", [result.insertId], (err, newUser) => {
            if (err) return res.status(500).json(err);
            res.json({ msg: "Usuario creado con Google", user: newUser[0] });
          });
        });
      }
    });
  } catch (err) {
    console.error("Error verificando token de Google:", err);
    res.status(401).json({ msg: "Token inválido o expirado" });
  }
});


// ====== GUARDAR RESPUESTAS Y OBTENER RECOMENDACIÓN ======
app.post("/chat", (req, res) => {
  const r = req.body;
  if (!r) return res.status(400).json({ msg: "No se recibieron respuestas" });

  // Guardar con Stored Procedure
  const sql = "CALL GuardarRespuestas(?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [
    r.userId || null,
    r.tipo_evento,
    r.invitados,
    parseFloat(r.presupuesto) || 0,
    r.lugar,
    r.horario,
    r.comida,
    r.musica,
    r.decoracion
  ], (err) => {
    if (err) {
      console.error("Error guardando respuestas:", err);
      return res.status(500).json({ msg: "Error guardando respuestas", error: err });
    }

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
  });
});

// ===== SERVIDOR =====

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));