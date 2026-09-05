import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { domAnimation, LazyMotion } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import { NotesProvider } from "@/context/NotesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { RequireAuth } from "@/routes/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import Home from "@/components/Home";
import About from "@/components/About";
import Login from "@/components/Login";
import Signup from "@/components/Signup";
import Profile from "@/components/Profile";

// Dev-only visual harness — tree-shaken from production builds.
const KitchenSink = import.meta.env.DEV ? lazy(() => import("@/views/KitchenSink")) : null;

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotesProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppShell>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <RequireAuth>
                          <Home />
                        </RequireAuth>
                      }
                    />
                    <Route path="/about" element={<About />} />
                    <Route path="/login" element={<Login />} />
                    {/* /register is canonical (matches production); /signup redirects. */}
                    <Route path="/register" element={<Signup />} />
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
                </AppShell>
              </Router>
            </NotesProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LazyMotion>
  );
}

export default App;
