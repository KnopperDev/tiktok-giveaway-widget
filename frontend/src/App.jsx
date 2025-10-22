import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Overlay from "./pages/Overlay";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <div>
        <nav style={{ padding: "1rem", background: "#222" }}>
          <Link to="/overlay" style={{ color: "white", marginRight: "1rem" }}>Overlay</Link>
          <Link to="/dashboard" style={{ color: "white" }}>Dashboard</Link>
        </nav>

        <Routes>
          <Route path="/overlay" element={<Overlay />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
