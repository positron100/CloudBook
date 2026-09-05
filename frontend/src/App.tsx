import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { domAnimation, LazyMotion } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import { NotesProvider } from "@/context/NotesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RequireAuth } from "@/routes/RequireAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Alert from "@/components/Alert";
import Home from "@/components/Home";
import About from "@/components/About";
import Login from "@/components/Login";
import Signup from "@/components/Signup";
import Profile from "@/components/Profile";
import type { AlertState, AlertType } from "@/types/alert";

// Dev-only visual harness for the design-system + motion primitives. Tree-shaken
// out of production builds (import.meta.env.DEV is statically false there).
const KitchenSink = import.meta.env.DEV ? lazy(() => import("@/views/KitchenSink")) : null;

function App() {
  const [alert, setAlert] = useState<AlertState>({ message: "", type: "" });
  const timeoutRef = useRef<number | undefined>(undefined);

  const showAlert = useCallback((message: string, type: AlertType) => {
    window.clearTimeout(timeoutRef.current);
    setAlert({ message, type });
    timeoutRef.current = window.setTimeout(() => setAlert({ message: "", type: "" }), 1500);
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <ThemeProvider>
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
                  {/* /register is canonical (matches production); /signup redirects. */}
                  <Route path="/register" element={<Signup showAlert={showAlert} />} />
                  <Route path="/signup" element={<Navigate to="/register" replace />} />
                  <Route
                    path="/profile"
                    element={
                      <RequireAuth>
                        <Profile />
                      </RequireAuth>
                    }
                  />
                  {KitchenSink && (
                    <Route
                      path="/kitchen-sink"
                      element={
                        <Suspense fallback={null}>
                          <KitchenSink />
                        </Suspense>
                      }
                    />
                  )}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
              <Footer />
            </Router>
          </NotesProvider>
        </AuthProvider>
      </ThemeProvider>
    </LazyMotion>
  );
}

export default App;
