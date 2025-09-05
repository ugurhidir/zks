import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, Button, CircularProgress, Alert, Container
} from '@mui/material';
import { getSettings, updateSettings } from '../services/api';

const SettingsPanel = () => {
  const [settings, setSettings] = useState({ kvkk_text: '', aydinlatma_text: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSettings();
      setSettings(response.data);
    } catch (err) {
      setError('Ayarlar yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateSettings(settings);
      setSuccess('Ayarlar başarıyla güncellendi.');
    } catch (err) {
      setError('Ayarlar güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          Metin Ayarları
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" noValidate autoComplete="off">
          <TextField
            name="kvkk_text"
            label="KVKK Metni"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={settings.kvkk_text}
            onChange={handleChange}
            sx={{ mb: 3 }}
          />
          <TextField
            name="aydinlatma_text"
            label="Kurumsal Aydınlatma Metni"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={settings.aydinlatma_text}
            onChange={handleChange}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Kaydet'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPanel;
