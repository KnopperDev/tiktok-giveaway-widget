import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Overlay from "./pages/Overlay";
import Dashboard from "./pages/Dashboard";
import "./App.scss";

function App() {
  return (
    <Router>
      <div className="app-root">
        <nav>
          <Link to="/dashboard">Dashboard</Link>
        </nav>

        <Routes>
          <Route path="/overlay" element={<Overlay />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
