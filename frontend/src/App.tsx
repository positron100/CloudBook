import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { domMax, LazyMotion } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import { NotesProvider } from "@/context/NotesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { RequireAuth } from "@/routes/RequireAuth";
import { RouteTransitionProvider } from "@/components/transitions/RouteTransition";
import { IntroOrchestrator } from "@/components/intro/IntroOrchestrator";
import { AppShell } from "@/components/layout/AppShell";
import Home from "@/components/Home";
import About from "@/components/About";
import AuthPage from "@/views/AuthPage";
import Profile from "@/components/Profile";

// Dev-only visual harnesses — tree-shaken from production builds.
const KitchenSink = import.meta.env.DEV ? lazy(() => import("@/views/KitchenSink")) : null;
const WorkspacePreview = import.meta.env.DEV ? lazy(() => import("@/views/WorkspacePreview")) : null;

function App() {
  return (
    <LazyMotion features={domMax} strict>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotesProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <RouteTransitionProvider>
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
                    {/* AuthPage is the PARENT element, so it stays mounted across
                        /login <-> /register (only the child match changes) and the
                        split-panel animates between modes instead of remounting.
                        The child `element` is a no-op that keeps React Router from
                        warning about an element-less leaf route. */}
                    <Route element={<AuthPage />}>
                      <Route path="/login" element={<span hidden />} />
                      <Route path="/register" element={<span hidden />} />
                    </Route>
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
                    {WorkspacePreview && (
                      <Route
                        path="/workspace-preview"
                        element={
                          <Suspense fallback={null}>
                            <WorkspacePreview />
                          </Suspense>
                        }
                      />
                    )}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppShell>
                </RouteTransitionProvider>
                <IntroOrchestrator />
              </Router>
            </NotesProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LazyMotion>
  );
}

export default App;
