import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Container, Box, Typography, AppBar, Toolbar, Button } from '@mui/material';
import VisitorForm from './components/VisitorForm';
import StaffPanel from './components/StaffPanel';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import SettingsPanel from './pages/SettingsPanel';
import UserManagementPanel from './pages/UserManagementPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  role: string;
}

// A simple component to represent the home page for visitors
const HomePage = () => (
  <Container maxWidth="lg">
    <Box sx={{ my: 4 }}>
      <VisitorForm />
    </Box>
  </Container>
);

// A simple header component with navigation
const Header = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  let userRole = '';

  if (token) {
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      userRole = decodedToken.role;
    } catch (error) {
      // Invalid token
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
    window.location.reload();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Ziyaretçi Kayıt Sistemi
          </Link>
        </Typography>
        {token && (
            <Button color="inherit" component={Link} to="/staff-panel">
                Personel Paneli
            </Button>
        )}
        {userRole === 'admin' && (
          <Button color="inherit" component={Link} to="/admin/users">
            Admin Paneli
          </Button>
        )}
        {token ? (
          <Button color="inherit" onClick={handleLogout}>
            Çıkış Yap
          </Button>
        ) : (
          <Button color="inherit" component={Link} to="/login">
            Personel Girişi
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
          <Route path="/staff-panel" element={<StaffPanel />} />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminPanel />}>
            <Route path="users" element={<UserManagementPanel />} />
            <Route path="settings" element={<SettingsPanel />} />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default App;
