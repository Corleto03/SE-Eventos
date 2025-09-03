import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto"; // <-- para SHA-256
import { OAuth2Client } from "google-auth-library"; // <-- para validar token de Google

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =================== CONEXIÓN MYSQL ===================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ Conectado a MySQL!");
});

// =================== CLIENTE GOOGLE ===================
const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

//
// =================== LOGIN LOCAL ===================
//
app.post("/login", (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ msg: "Correo y contraseña requeridos" });
  }

  const sql =
    "SELECT * FROM usuarios WHERE correo = ? AND proveedor = 'local'";
  db.query(sql, [correo], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0)
      return res.status(401).json({ msg: "Usuario no encontrado" });

    const user = results[0];

    // Calcular hash SHA-256 de la contraseña ingresada
    const hash = crypto.createHash("sha256").update(password).digest("hex");

    if (hash !== user.password_hash) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    // Login exitoso
    res.json({
      msg: "Login correcto",
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        proveedor: user.proveedor,
      },
    });
  });
});

//
// =================== LOGIN CON GOOGLE ===================
//
app.post("/auth/google", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ msg: "Token no proporcionado" });
  }

  try {
    // Verificar token contra Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const correo = payload.email;
    const nombre = payload.name;

    // Verificar si el usuario ya existe
    const sql = "SELECT * FROM usuarios WHERE correo = ?";
    db.query(sql, [correo], (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.length > 0) {
        // Usuario ya existe
        return res.json({
          msg: "Login con Google correcto",
          user: results[0],
        });
      } else {
        // Crear usuario nuevo
        const insertSql = `
          INSERT INTO usuarios(nombre, correo, proveedor, password_hash)
          VALUES(?, ?, 'google', NULL)
        `;
        db.query(insertSql, [nombre, correo], (err, result) => {
          if (err) return res.status(500).json(err);
          db.query(
            "SELECT * FROM usuarios WHERE id = ?",
            [result.insertId],
            (err, newUser) => {
              if (err) return res.status(500).json(err);
              res.json({
                msg: "Usuario creado con Google",
                user: newUser[0],
              });
            }
          );
        });
      }
    });
  } catch (err) {
    console.error("❌ Error verificando token de Google:", err);
    res.status(401).json({ msg: "Token inválido o expirado" });
  }
});

//
// =================== SERVIDOR ===================
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
);
