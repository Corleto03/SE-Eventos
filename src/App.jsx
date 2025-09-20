import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Chat from "./pages/Chat";
import Register from "./Pages/register"; // 👈 ¡Faltaba esta importación!

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/register" element={<Register />} /> {/* 👈 Nueva ruta */}
      </Routes>
    </Router>
  );
}

export default App;
