import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import sys
import json
import os
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib

# === Cargar datos recibidos de Node.js ===
try:
    data = json.loads(sys.argv[1])
    print(f"DEBUG: Datos recibidos: {data}", file=sys.stderr)
except Exception as e:
    print(f"ERROR: no se pudo leer entrada JSON: {e}", file=sys.stderr)
    output = {
        "prediccion": 0.0,
        "msg": "Error al leer los datos",
        "recomendacion": "No se pudieron procesar los datos enviados",
        "presupuesto_suficiente": False,
        "diferencia": 0.0
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    sys.exit(1)

try:
    # === Extraer variables ===
    nombre_usuario = data.get("nombre", "Usuario")
    tipo_evento = data.get("tipo_evento", "")
    invitados = int(data.get("invitados", 0))
    presupuesto = float(data.get("presupuesto", 0))
    lugar = data.get("lugar", "")
    horario = data.get("horario", "")
    comida = data.get("comida", "")
    musica = data.get("musica", "")
    decoracion = data.get("decoracion", "")

    input_dict = {
        "tipo_evento": tipo_evento,
        "invitados": invitados,
        "presupuesto": presupuesto,
        "lugar": lugar,
        "horario": horario,
        "comida": comida,
        "musica": musica,
        "decoracion": decoracion
    }

    print(f"DEBUG: Variables extraídas correctamente", file=sys.stderr)

    # === Cargar modelo y transformadores ===
    base_path = os.path.dirname(__file__)
    modelo_path = os.path.join(base_path, "modelo_eventos.h5")
    encoder_path = os.path.join(base_path, "encoder.pkl")
    scaler_path = os.path.join(base_path, "scaler.pkl")

    print(f"DEBUG: Cargando modelo desde: {modelo_path}", file=sys.stderr)

    encoder = joblib.load(encoder_path)
    scaler = joblib.load(scaler_path)
    model = tf.keras.models.load_model(modelo_path)

    print(f"DEBUG: Modelo y transformadores cargados exitosamente", file=sys.stderr)

    # === Preprocesamiento ===
    categorical_cols = ["tipo_evento", "lugar", "horario", "comida", "musica", "decoracion"]
    numeric_cols = ["invitados", "presupuesto"]

    X_input = pd.DataFrame([input_dict])
    X_cat = encoder.transform(X_input[categorical_cols])
    X_num = scaler.transform(X_input[numeric_cols])
    X_final = np.hstack([X_num, X_cat])

    print(f"DEBUG: Preprocesamiento completado", file=sys.stderr)

    # === Predicción ===
    pred = model.predict(X_final, verbose=0)[0][0]

    # Debug: verificar que la predicción funciona
    print(f"DEBUG: Predicción exitosa: {pred}", file=sys.stderr)

    print(f"DEBUG: Datos - nombre: {nombre_usuario}, tipo: {tipo_evento}, invitados: {invitados}, presupuesto: {presupuesto}", file=sys.stderr)

    # Mensaje base simple
    mensaje_base = f"Perfecto {nombre_usuario}, he analizado tu evento de {tipo_evento} para {invitados} invitados."

    # Recomendación simple
    if pred > presupuesto:
        diferencia = pred - presupuesto
        recomendacion = f"Costo estimado: ${pred:.0f}. Tu presupuesto: ${presupuesto:.0f}. Necesitas ${diferencia:.0f} adicionales."
    else:
        diferencia = presupuesto - pred
        recomendacion = f"Costo estimado: ${pred:.0f}. Tu presupuesto: ${presupuesto:.0f}. Te sobran ${diferencia:.0f}."

    print(f"DEBUG: Mensajes generados correctamente", file=sys.stderr)

    # === Salida simple ===
    output = {
        "prediccion": float(pred),
        "msg": mensaje_base,
        "recomendacion": recomendacion,
        "presupuesto_suficiente": bool(pred <= presupuesto),
        "diferencia": float(abs(pred - presupuesto))
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))

except Exception as e:
    print(f"ERROR en predict.py: {str(e)}", file=sys.stderr)
    import traceback
    print(f"TRACEBACK: {traceback.format_exc()}", file=sys.stderr)
    
    # Fallback de emergencia
    output = {
        "prediccion": 0.0,
        "msg": "Error en el análisis",
        "recomendacion": f"Ocurrió un error: {str(e)}",
        "presupuesto_suficiente": False,
        "diferencia": 0.0
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
