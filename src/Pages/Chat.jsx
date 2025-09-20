import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "./Chat.css";

export default function Chat() {
  const location = useLocation();
  const user = location.state?.user || { id: null, nombre: "Invitado", correo: "" };

  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const chatEndRef = useRef(null);

  const preguntas = useMemo(() => [
    { id: "tipo_evento", pregunta: "¿Qué tipo de evento deseas?", opciones: ["Boda", "Cumpleaños", "Quinceaños"] },
    { id: "presupuesto", pregunta: "Ingresa tu presupuesto aproximado en números", tipo: "numero" },
    { id: "invitados", pregunta: "¿Cuántas personas asistirán al evento?", tipo: "numero" },
    { id: "lugar", pregunta: "¿El evento será en interior o exterior?", opciones: ["Interior", "Exterior"] },
    { id: "horario", pregunta: "¿El evento será de día o de noche?", opciones: ["Día", "Noche"] },
    { id: "comida", pregunta: "¿Qué tipo de servicio de comida prefieres?", opciones: ["Buffet", "A la carta", "No se necesita comida"] },
    { id: "musica", pregunta: "¿Qué tipo de música prefieres?", opciones: ["Música en vivo", "DJ", "Playlist pregrabada", "Sin música"] },
    { id: "decoracion", pregunta: "¿Qué tipo de decoración prefieres?", opciones: ["Arreglos florales", "Centros de mesa elegantes", "Guirnaldas o globos", "Sin decoración"] },
    { id: "fecha", pregunta: "¿Cuál es la fecha del evento?", tipo: "fecha" }
  ], []);

  useEffect(() => {
    if (step === -1 && messages.length === 0) {
      addMessage(`Hola ${user.nombre}, bienvenido al asistente de eventos. Comencemos con algunas preguntas.`, "bot");
      setTimeout(() => {
        addMessage(preguntas[0].pregunta, "bot");
        setStep(0);
      }, 1000);
    }
  }, [step, messages, preguntas, user.nombre]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender }]);
  };

  const handleNext = async (respuesta) => {
    if (enviando) return;
    
    if (!confirmando) {
      const key = preguntas[step].id;
      setAnswers(prev => ({ ...prev, [key]: respuesta }));
      addMessage(respuesta, "user");
    }

    if (!confirmando && step < preguntas.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      setTimeout(() => addMessage(preguntas[nextStep].pregunta, "bot"), 500);
    } else if (!confirmando) {
      setConfirmando(true);
      addMessage("¿Confirmas que tus respuestas son correctas?", "bot");
    } else {
      if (respuesta.toLowerCase() === "sí" || respuesta.toLowerCase() === "si") {
        setEnviando(true);
        await enviarRespuestas({ ...answers, userId: user.id, nombre: user.nombre });
        setStep(-1);
        setAnswers({});
        setConfirmando(false);
        setEnviando(false);
      } else {
        setStep(0);
        setAnswers({});
        setInputValue("");
        setConfirmando(false);
        addMessage("Perfecto, reiniciemos el cuestionario para que puedas corregir tus respuestas.", "bot");
        setTimeout(() => addMessage(preguntas[0].pregunta, "bot"), 500);
      }
    }

    setInputValue("");
  };

  const enviarRespuestas = async (respuestasFinales) => {
    try {
      if (respuestasFinales.presupuesto) {
        respuestasFinales.presupuesto = parseFloat(respuestasFinales.presupuesto);
      }

      console.log("Enviando datos:", respuestasFinales);

      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respuestasFinales)
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Respuesta recibida:", data);

      // Mostrar la respuesta formateada
      if (data.msg) {
        addMessage(data.msg, "bot");
      }

      if (data.recomendacion) {
        setTimeout(() => {
          addMessage(data.recomendacion, "bot");
        }, 500);
      }

    } catch (err) {
      console.error("Error completo:", err);
      addMessage("❌ Ocurrió un error conectando al servidor. Por favor intenta de nuevo.", "bot");
      setEnviando(false);
    }
  };

  // Función para manejar comandos especiales
  const handleSpecialCommands = (input) => {
    if (input.toLowerCase().includes('nuevo') || input.toLowerCase().includes('reiniciar')) {
      setStep(-1);
      setAnswers({});
      setConfirmando(false);
      setMessages([]);
      return true;
    }
    return false;
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={msg.sender === "bot" ? "bot-message" : "user-message"}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {msg.text}
            </pre>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {step >= 0 && step < preguntas.length && !confirmando && (
        preguntas[step].opciones ? (
          <div className="options-container">
            {preguntas[step].opciones.map(op => (
              <button 
                key={op} 
                className="option-button" 
                onClick={() => handleNext(op)}
                disabled={enviando}
              >
                {op}
              </button>
            ))}
          </div>
        ) : (
          <input
            className="input"
            type={preguntas[step].tipo === "fecha" ? "date" : "number"}
            min={preguntas[step].tipo === "numero" ? 1 : undefined}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim() !== "" && !enviando) {
                handleNext(inputValue);
              }
            }}
            placeholder={preguntas[step].tipo === "numero" ? "Escribe tu respuesta y presiona Enter" : ""}
            disabled={enviando}
          />
        )
      )}

      {confirmando && (
        <div className="options-container">
          <button 
            className="option-button" 
            onClick={() => handleNext("Sí")}
            disabled={enviando}
          >
            {enviando ? "Analizando..." : "Sí"}
          </button>
          <button 
            className="option-button" 
            onClick={() => handleNext("No")}
            disabled={enviando}
          >
            No
          </button>
        </div>
      )}

      {/* Input libre para comandos especiales cuando no hay cuestionario activo */}
      {step === -1 && !confirmando && messages.length > 0 && (
        <input
          className="input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue.trim() !== "") {
              const wasSpecialCommand = handleSpecialCommands(inputValue);
              if (!wasSpecialCommand) {
                addMessage(inputValue, "user");
                addMessage("Para consultar un nuevo evento, escribe 'nuevo'. ¿En qué más puedo ayudarte?", "bot");
              }
              setInputValue("");
            }
          }}
          placeholder="Escribe 'nuevo' para otra consulta..."
          disabled={enviando}
        />
      )}
    </div>
  );
}