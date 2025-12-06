import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Home } from './pages/Home';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { Chat } from './pages/Chat';
import { Connections } from './pages/Connections';
import { Profile } from './pages/Profile';
import { SocialLinks } from './pages/SocialLinks';
import { SocialLinkPermissions } from './pages/SocialLinkPermissions';
import { ContactProfile } from './pages/ContactProfile';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connections"
        element={
          <ProtectedRoute>
            <Connections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/social-links"
        element={
          <ProtectedRoute>
            <SocialLinks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/social-links/:linkId/permissions"
        element={
          <ProtectedRoute>
            <SocialLinkPermissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contact/:userId"
        element={
          <ProtectedRoute>
            <ContactProfile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
