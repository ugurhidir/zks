import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Checkbox, FormControlLabel, CircularProgress, Alert, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { validateVisitor, createVisitor, getSettings } from '../services/api';

interface VisitorFormData {
  [key: string]: string;
  tc_kimlik: string;
  first_name: string;
  last_name: string;
  birth_year: string;
  reason_for_visit: string;
}

const VisitorForm = () => {
  const [formData, setFormData] = useState<VisitorFormData>({
    tc_kimlik: '',
    first_name: '',
    last_name: '',
    birth_year: '',
    reason_for_visit: '',
  });
  const [kvkkText, setKvkkText] = useState('');
  const [aydinlatmaText, setAydinlatmaText] = useState('');
  const [visitorPdfPath, setVisitorPdfPath] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const [aydinlatmaChecked, setAydinlatmaChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tcKimlikError, setTcKimlikError] = useState<string | null>(null); // New state for TC Kimlik error

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getSettings();
        setKvkkText(response.data.kvkk_text || 'KVKK metni yüklenemedi.');
        setAydinlatmaText(response.data.aydinlatma_text || 'Kurumsal Aydınlatma metni yüklenemedi.');
        setVisitorPdfPath(response.data.visitor_pdf_path || null);
        setRedirectUrl(response.data.redirect_url || null);
      } catch (err) {
        console.error('Ayarlar yüklenirken hata:', err);
        setError('Aydınlatma metinleri yüklenirken bir hata oluştu.');
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'tc_kimlik') {
      const re = /^[0-9\b]+$/; // Only allow digits
      if (value === '' || re.test(value)) {
        setFormData({ ...formData, [name]: value });
        if (value.length !== 11) {
          setTcKimlikError('TC Kimlik Numarası 11 haneli olmalıdır.');
        } else {
          setTcKimlikError(null);
        }
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Additional client-side validation for TC Kimlik before sending to backend
    if (formData.tc_kimlik.length !== 11 || !/^[0-9]+$/.test(formData.tc_kimlik)) {
      setTcKimlikError('TC Kimlik Numarası 11 haneli ve sadece rakamlardan oluşmalıdır.');
      setLoading(false);
      return;
    }


    try {
      // Step 1: Validate user data
      await validateVisitor({
        tc_kimlik: formData.tc_kimlik,
        first_name: formData.first_name,
        last_name: formData.last_name,
        birth_year: formData.birth_year,
      });

      // Step 2: If validation is successful, register the visitor
      const response = await createVisitor(formData);
      setSuccess(`Kayıt başarılı! Hoş geldiniz, ${response.data.first_name}.`);

      const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
      // Download PDF
      if (visitorPdfPath) {
        const link = document.createElement('a');
        link.href = `${API_URL}${visitorPdfPath}`;
        link.setAttribute('download', ''); // Or a specific filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Redirect
      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000); // Delay to allow download to start
      }

      // Reset form
      setFormData({ tc_kimlik: '', first_name: '', last_name: '', birth_year: '', reason_for_visit: '' });
      setKvkkChecked(false);
      setAydinlatmaChecked(false);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const requiredFields = ['tc_kimlik', 'first_name', 'last_name', 'birth_year', 'reason_for_visit'];
  const isFormValid = requiredFields.every(field => formData[field] && String(formData[field]).trim() !== '') && kvkkChecked && aydinlatmaChecked && !tcKimlikError;

  // Generate years for dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Ziyaretçi Giriş Formu
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          name="tc_kimlik"
          label="TC Kimlik Numarası"
          value={formData.tc_kimlik}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          inputProps={{ maxLength: 11 }} // Limit input length
          error={!!tcKimlikError} // Show error state
          helperText={tcKimlikError} // Display error message
        />
        <TextField name="first_name" label="Ad" value={formData.first_name} onChange={handleChange} fullWidth margin="normal" required />
        <TextField name="last_name" label="Soyad" value={formData.last_name} onChange={handleChange} fullWidth margin="normal" required type="text" /> {/* Changed type to text */}
        
        {/* Birth Year Select */}
        <FormControl fullWidth margin="normal" required>
          <InputLabel id="birth-year-label">Doğum Yılı</InputLabel>
          <Select
            labelId="birth-year-label"
            id="birth_year"
            name="birth_year"
            value={formData.birth_year}
            label="Doğum Yılı"
            onChange={handleSelectChange}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField name="reason_for_visit" label="Ziyaret Sebebi" value={formData.reason_for_visit} onChange={handleChange} fullWidth margin="normal" required multiline rows={3} />

        {/* KVKK Metni */}
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>KVKK Metni</Typography>
        <Box
          sx={{
            height: '150px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            p: 2,
            mb: 2,
            backgroundColor: '#f9f9f9',
            whiteSpace: 'pre-wrap' // To preserve line breaks from fetched text
          }}
        >
          {kvkkText}
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={kvkkChecked}
              onChange={(e) => setKvkkChecked(e.target.checked)}
            />
          }
          label="KVKK Metnini okudum ve onaylıyorum."
        />

        {/* Kurumsal Aydınlatma Metni */}
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Kurumsal Aydınlatma Metni</Typography>
        <Box
          sx={{
            height: '150px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            p: 2,
            mb: 2,
            backgroundColor: '#f9f9f9',
            whiteSpace: 'pre-wrap' // To preserve line breaks from fetched text
          }}
        >
          {aydinlatmaText}
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={aydinlatmaChecked}
              onChange={(e) => setAydinlatmaChecked(e.target.checked)}
            />
          }
          label="Kurumsal Aydınlatma Metnini okudum ve onaylıyorum."
        />

        <Box sx={{ mt: 2, position: 'relative' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!isFormValid || loading}
            fullWidth
          >
            Giriş Kaydı Oluştur
          </Button>
          {loading && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </Box>
    </Paper>
  );
};

export default VisitorForm;