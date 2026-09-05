import { useCallback, useRef, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { NotesProvider } from "@/context/NotesContext";
import { RequireAuth } from "@/routes/RequireAuth";
import Navbar from "@/components/Navbar";
import Alert from "@/components/Alert";
import Home from "@/components/Home";
import About from "@/components/About";
import Login from "@/components/Login";
import Signup from "@/components/Signup";
import type { AlertState, AlertType } from "@/types/alert";

function App() {
  const [alert, setAlert] = useState<AlertState>({ message: "", type: "" });
  const timeoutRef = useRef<number | undefined>(undefined);

  const showAlert = useCallback((message: string, type: AlertType) => {
    window.clearTimeout(timeoutRef.current);
    setAlert({ message, type });
    timeoutRef.current = window.setTimeout(() => setAlert({ message: "", type: "" }), 1500);
  }, []);

  return (
    <AuthProvider>
      <NotesProvider>
        <Router>
          <Navbar />
          <Alert alert={alert} />
          <div className="container">
            <Routes>
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Home showAlert={showAlert} />
                  </RequireAuth>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login showAlert={showAlert} />} />
              <Route path="/signup" element={<Signup showAlert={showAlert} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </NotesProvider>
    </AuthProvider>
  );
}

export default App;
