import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, CircularProgress, Alert, IconButton,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem, FormControl, InputLabel, Container,
  TablePagination // Import TablePagination
} from '@mui/material';
import { getUsers, createUser, deleteUser, updateUser } from '../services/api';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search'; // Import SearchIcon

interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  created_at: string;
}

const UserManagementPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formUser, setFormUser] = useState({ username: '', password: '', role: 'staff' });

  // State for search, filter, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState(''); // 'admin', 'staff', or '' for all
  const [page, setPage] = useState(0); // Material-UI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getUsers({
        search: searchQuery,
        role: filterRole,
        page: page + 1, // Backend is 1-indexed
        limit: rowsPerPage,
      });
      setUsers(response.data.users);
      setTotalUsers(response.data.pagination.totalUsers);
    } catch (err) {
      setError('Kullanıcılar yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterRole, page, rowsPerPage]); // Dependencies for useCallback

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreateDialog = () => {
    setIsEditing(false);
    setFormUser({ username: '', password: '', role: 'staff' });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setIsEditing(true);
    setCurrentUser(user);
    setFormUser({ username: user.username, password: '', role: user.role });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setIsEditing(false);
    setCurrentUser(null);
    setFormUser({ username: '', password: '', role: 'staff' });
    setError(null);
  };

  const handleSubmitUser = async () => {
    setError(null);
    try {
      if (isEditing && currentUser) {
        const updateData: { username: string; password?: string; role: 'admin' | 'staff' } = {
            username: formUser.username,
            role: formUser.role
        };
        if (formUser.password) {
            updateData.password = formUser.password;
        }
        await updateUser(currentUser.id, updateData);
      } else {
        await createUser(formUser);
      }
      fetchUsers();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
        try {
            await deleteUser(id);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kullanıcı silinirken bir hata oluştu.');
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormUser(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: any) => {
    setFormUser(prev => ({ ...prev, role: e.target.value }));
  };
  
  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('tr-TR');
  }

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Kullanıcı Yönetimi
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Yeni Kullanıcı
          </Button>
        </Box>

        {/* Search and Filter */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Kullanıcı Ara"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: <SearchIcon />,
            }}
          />
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Rol</InputLabel>
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as string)}
              label="Rol"
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="staff">Personel</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        {!loading && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Kullanıcı Adı</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rol</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Oluşturulma Tarihi</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{formatDateTime(user.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenEditDialog(user)} color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteUser(user.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Sayfa başına satır:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `more than ${to}`}`}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{isEditing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Oluştur'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            name="username"
            label="Kullanıcı Adı"
            type="text"
            fullWidth
            variant="standard"
            value={formUser.username}
            onChange={handleInputChange}
            disabled={isEditing}
          />
          <TextField
            margin="dense"
            name="password"
            label={isEditing ? 'Yeni Şifre (boş bırakılırsa değişmez)' : 'Şifre'}
            type="password"
            fullWidth
            variant="standard"
            value={formUser.password}
            onChange={handleInputChange}
            required={!isEditing}
          />
          <FormControl fullWidth margin="dense" variant="standard">
            <InputLabel>Rol</InputLabel>
            <Select
              name="role"
              value={formUser.role}
              label="Rol"
              onChange={handleRoleChange}
            >
              <MenuItem value="staff">Personel (Staff)</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSubmitUser} color="primary">
            {isEditing ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagementPanel;
