import tensorflow as tf
import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import joblib
import mysql.connector
import numpy as np

# Conexión a MySQL (solo si lo necesitas, sino puedes comentar)
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="12345",
    database="eventosdb"
)

# === Cargar dataset ===
data_path = os.path.join(os.path.dirname(__file__), "dataset.csv")
data = pd.read_csv(data_path)

# === Variables y target ===
X = data.drop("costo_real", axis=1)
y = data["costo_real"]

# === Separar numéricas y categóricas ===
categorical_cols = ["tipo_evento", "lugar", "horario", "comida", "musica", "decoracion"]
numeric_cols = ["invitados", "presupuesto"]

# One-hot encoding
encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
X_cat = encoder.fit_transform(X[categorical_cols])

# Escalado de numéricas
scaler = StandardScaler()
X_num = scaler.fit_transform(X[numeric_cols])

# Dataset final
X_final = np.hstack([X_num, X_cat])

# === Guardar encoder y scaler ===
joblib.dump(encoder, os.path.join(os.path.dirname(__file__), "encoder.pkl"))
joblib.dump(scaler, os.path.join(os.path.dirname(__file__), "scaler.pkl"))

# === Split train/test ===
X_train, X_test, y_train, y_test = train_test_split(X_final, y, test_size=0.2, random_state=42)

# === Modelo ===
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(X_final.shape[1],)),
    tf.keras.layers.Dense(64, activation="relu"),
    tf.keras.layers.Dense(32, activation="relu"),
    tf.keras.layers.Dense(1, activation="linear")  # regresión
])

# Usar clases de TensorFlow para evitar problemas con H5
model.compile(
    optimizer="adam",
    loss=tf.keras.losses.MeanSquaredError(),
    metrics=[tf.keras.metrics.MeanAbsoluteError()]
)

# === Entrenar ===
model.fit(X_train, y_train, validation_data=(X_test, y_test), epochs=50, batch_size=8)

# === Guardar modelo ===
modelo_path = os.path.join(os.path.dirname(__file__), "modelo_eventos.h5")
model.save(modelo_path)
print(f"✅ Modelo entrenado y guardado en {modelo_path}")

# === Cerrar conexión a MySQL ===
conn.close()
