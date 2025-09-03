import { useState, useEffect, useRef } from "react"; 
import { useLocation } from "react-router-dom";
import "./Chat.css";

export default function Chat() {
  const location = useLocation();
  const user = location.state?.user || { nombre: "Invitado", correo: "" };

  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [inputValue, setInputValue] = useState(""); 
  const chatEndRef = useRef(null);

  const preguntas = [
    { id: "tipo_evento", pregunta: "¿Qué tipo de evento deseas?", opciones: ["Boda", "Cumpleaños", "15 años"] },
    { id: "invitados", pregunta: "¿Cuántos invitados esperas?" },
    { id: "presupuesto", pregunta: "¿Cuál es tu presupuesto aproximado?" },
    { id: "tematica", pregunta: "¿Qué temática deseas?" },
    { id: "lugar", pregunta: "¿Tienes algún lugar en mente?" },
    { id: "fecha", pregunta: "¿Cuál es la fecha del evento?" },
  ];

  useEffect(() => {
  if (step === -1 && messages.length === 0) {
    addMessage(
      `Hola ${user.nombre || user.correo}, bienvenido al asistente de eventos! 😊 Empecemos con unas preguntas para conocer tu evento.`,
      "bot"
    );

    setTimeout(() => {
      addMessage(preguntas[0].pregunta, "bot");
      setStep(0);
    }, 2000); // 800 ms de espera
  }
}, [step, messages]);


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

    setInputValue(""); // limpiar input después de responder
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
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={msg.sender === "bot" ? "bot-message" : "user-message"}>
            <pre style={{ margin: 0 }}>{msg.text}</pre>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {step >= 0 && step < preguntas.length && (
        preguntas[step].opciones ? (
          <div className="options-container">
            {preguntas[step].opciones.map(op => (
              <button key={op} className="option-button" onClick={() => handleNext(op)}>{op}</button>
            ))}
          </div>
        ) : (
          preguntas[step].id === "fecha" ? (
            <input
              className="input"
              type="date"
              min={new Date().toISOString().split("T")[0]} // 👈 evita fechas anteriores a hoy
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue.trim() !== "") {
                  handleNext(inputValue);
                }
              }}
            />
          ) : (
            <input
              className="input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue.trim() !== "") {
                  handleNext(inputValue);
                }
              }}
              placeholder="Escribe tu respuesta y presiona Enter"
            />
          )
        )
      )}
    </div>
  );
}
