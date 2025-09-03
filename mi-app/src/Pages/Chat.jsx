import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function Chat() {
  const location = useLocation();
  const user = location.state?.user || { nombre: "Invitado", correo: "" };

  const [step, setStep] = useState(-1); // Saludo inicial
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [resultado, setResultado] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const preguntas = [
    { id: "tipo_evento", pregunta: "¿Qué tipo de evento deseas?", opciones: ["Boda", "Cumpleaños", "15 años"] },
    { id: "invitados", pregunta: "¿Cuántos invitados esperas?" },
    { id: "presupuesto", pregunta: "¿Cuál es tu presupuesto aproximado?" },
    { id: "tematica", pregunta: "¿Qué temática deseas?" },
    { id: "lugar", pregunta: "¿Tienes algún lugar en mente?" },
    { id: "fecha", pregunta: "¿Cuál es la fecha del evento?" },
  ];

  // Saludo inicial - solo una vez
  useEffect(() => {
    if (step === -1 && messages.length === 0) {
      addMessage(
        `Hola ${user.nombre || user.correo}, bienvenido al asistente de eventos! 😊 Empecemos con unas preguntas para conocer tu evento.`,
        "bot"
      );
      setStep(0);
    }
  }, [step, messages]);

  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender }]);
  };

  const handleNext = (respuesta) => {
    if (step >= 0) {
      const key = preguntas[step].id;
      setAnswers(prev => ({ ...prev, [key]: respuesta }));
      addMessage(respuesta, "user");
    }

    if (step < preguntas.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      setTimeout(() => {
        addMessage(preguntas[nextStep].pregunta, "bot");
      }, 500);
    } else {
      enviarRespuestas({ ...answers, [preguntas[step].id]: respuesta });
      setStep(step + 1);
    }
  };

  const enviarRespuestas = async (respuestasFinales) => {
    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respuestasFinales)
      });

      const data = await res.json();
      addMessage("¡Listo! Aquí tienes nuestra recomendación:", "bot");
      addMessage(JSON.stringify(data.recomendacion, null, 2), "bot");
      setResultado(data.recomendacion);
    } catch (err) {
      console.error(err);
      addMessage("Ocurrió un error conectando al servidor.", "bot");
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.messagesContainer}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.sender === "bot" ? styles.botMessage : styles.userMessage}>
            <pre style={{ margin: 0 }}>{msg.text}</pre>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {step >= 0 && step < preguntas.length && (
        preguntas[step].opciones ? (
          <div style={styles.optionsContainer}>
            {preguntas[step].opciones.map(op => (
              <button key={op} style={styles.optionButton} onClick={() => handleNext(op)}>{op}</button>
            ))}
          </div>
        ) : (
          <input
            ref={inputRef}
            style={styles.input}
            type="text"
            onKeyDown={(e) => e.key === "Enter" && handleNext(e.target.value)}
            placeholder="Escribe tu respuesta y presiona Enter"
          />
        )
      )}
    </div>
  );
}

const styles = {
  chatContainer: {
    width: "90%",
    maxWidth: "800px",
    margin: "20px auto",
    border: "1px solid #ccc",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    height: "80vh",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#fff"
  },
  messagesContainer: {
    flex: 1,
    padding: "10px",
    overflowY: "auto",
    background: "#f9f9f9",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: "200px"
  },
  botMessage: {
    alignSelf: "flex-start",
    background: "#e0e0e0",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "80%"
  },
  userMessage: {
    alignSelf: "flex-end",
    background: "#6B73FF",
    color: "#fff",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "80%"
  },
  optionsContainer: {
    display: "flex",
    gap: "10px",
    padding: "10px",
    flexWrap: "wrap",
    background: "#fff"
  },
  optionButton: {
    padding: "10px 15px",
    borderRadius: "8px",
    border: "none",
    background: "#6B73FF",
    color: "#fff",
    cursor: "pointer"
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    width: "calc(100% - 20px)",
    margin: "10px"
  }
};