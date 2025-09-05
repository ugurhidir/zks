import { Box, Tabs, Tab, Container } from '@mui/material';
import { Link, useLocation, Outlet } from 'react-router-dom';

const AdminPanel = () => {
  const location = useLocation();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={location.pathname}>
                <Tab label="Kullanıcı Yönetimi" value="/admin/users" component={Link} to="/admin/users" />
                <Tab label="Metin Ayarları" value="/admin/settings" component={Link} to="/admin/settings" />
            </Tabs>
        </Box>
        <Box sx={{ pt: 3 }}>
            <Outlet />
        </Box>
    </Container>
  );
};

export default AdminPanel;
