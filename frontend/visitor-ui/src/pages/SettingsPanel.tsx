import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, Button, CircularProgress, Alert, Container
} from '@mui/material';
import { getSettings, updateSettings, uploadPdf } from '../services/api';

const SettingsPanel = () => {
  const [settings, setSettings] = useState({ kvkk_text: '', aydinlatma_text: '', visitor_pdf_path: '', redirect_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Lütfen bir dosya seçin.');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await uploadPdf(selectedFile);
      setSettings(prev => ({ ...prev, visitor_pdf_path: response.data.filePath }));
      setSuccess('Dosya başarıyla yüklendi.');
    } catch (err) {
      setError('Dosya yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          Metin ve Yönlendirme Ayarları
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" noValidate autoComplete="off">
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>İndirilecek PDF Dosyası</Typography>
            <input type="file" accept=".pdf" onChange={handleFileChange} />
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              sx={{ ml: 2 }}
            >
              {uploading ? <CircularProgress size={24} /> : 'Yükle'}
            </Button>
            {settings.visitor_pdf_path && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Mevcut dosya: <a href={settings.visitor_pdf_path} target="_blank" rel="noopener noreferrer">{settings.visitor_pdf_path}</a>
              </Typography>
            )}
          </Box>
          <TextField
            name="redirect_url"
            label="Yönlendirilecek URL"
            fullWidth
            variant="outlined"
            value={settings.redirect_url}
            onChange={handleChange}
            sx={{ mb: 3 }}
          />
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
            {loading ? <CircularProgress size={24} /> : 'Ayarları Kaydet'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPanel;
