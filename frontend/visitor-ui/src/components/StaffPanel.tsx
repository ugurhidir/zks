import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, CircularProgress, Alert, IconButton,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid // Added Grid for metrics layout
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getActiveVisitors, getPastVisitors, deactivateVisitor, getVisitorMetrics } from '../services/api'; // Added getVisitorMetrics

interface Visitor {
  id: string;
  tc_kimlik: string;
  first_name: string;
  last_name: string;
  birth_year: string;
  reason_for_visit: string;
  entry_time: string;
  exit_time: string | null;
  visit_duration: string | null;
  is_active: boolean;
}

const StaffPanel = () => {
  const [view, setView] = useState('active');
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [pastVisitors, setPastVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState(null); // State for metrics

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeRes, pastRes, metricsRes] = await Promise.all([
        getActiveVisitors(),
        getPastVisitors(),
        getVisitorMetrics(), // Fetch metrics
      ]);
      setActiveVisitors(activeRes.data);
      setPastVisitors(pastRes.data);
      setMetrics(metricsRes.data);
    } catch (err) {
      setError('Veriler yüklenirken bir hata oluştu. Oturumunuzun süresi dolmuş olabilir.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCheckoutDialog = (id: string) => {
    setSelectedVisitorId(id);
    setDialogOpen(true);
  };

  const closeCheckoutDialog = () => {
    setSelectedVisitorId(null);
    setDialogOpen(false);
  };

  const handleCheckout = async () => {
    if (!selectedVisitorId) return;
    try {
      await deactivateVisitor(selectedVisitorId);
      fetchData(); // Refresh data after checkout
    } catch (err) {
      setError('Çıkış işlemi sırasında bir hata oluştu.');
    } finally {
      closeCheckoutDialog();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setView(newValue);
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('tr-TR');
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
        {/* Visitor Metrics Section */}
        <Typography variant="h5" component="h2" gutterBottom>
            Ziyaretçi Metrikleri
        </Typography>
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}> {/* Changed elevation and mb for subtle look */}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>} {/* Smaller spinner */}
            {error && <Typography color="error">{error}</Typography>}
            {metrics && (
                <Grid container spacing={2}> {/* Smaller spacing */}
                    <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle1" color="primary">Bugün Gelen Ziyaretçi</Typography> {/* Smaller variant */}
                        <Typography variant="h5">{metrics.visitorsToday}</Typography> {/* Smaller variant */}
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle1" color="primary">Aktif Ziyaretçi</Typography>
                        <Typography variant="h5">{metrics.activeVisitors}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle1" color="primary">Ort. Ziyaret Süresi</Typography>
                        <Typography variant="h5">{metrics.averageVisitDurationMinutes} dk</Typography>
                    </Grid>
                </Grid>
            )}
        </Paper>
        {/* End Visitor Metrics Section */}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Danışma Paneli
          </Typography>
          <IconButton onClick={fetchData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Tabs value={view} onChange={handleTabChange} centered sx={{ mb: 2 }}>
          <Tab label={`Aktif Ziyaretçiler (${activeVisitors.length})`} value="active" />
          <Tab label="Geçmiş Ziyaretçiler" value="past" />
        </Tabs>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        {!loading && (
          <Box>
            {view === 'active' && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>No.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>TC Kimlik No</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Ad Soyad</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Ziyaret Sebebi</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Giriş Zamanı</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Ziyaretçi ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeVisitors.map((v, index) => (
                      <TableRow key={v.id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{v.tc_kimlik}</TableCell>
                        <TableCell>{`${v.first_name} ${v.last_name}`}</TableCell>
                        <TableCell>{v.reason_for_visit}</TableCell>
                        <TableCell>{formatDateTime(v.entry_time)}</TableCell>
                        <TableCell><code>{v.id}</code></TableCell>
                        <TableCell align="right">
                          <Button variant="outlined" color="secondary" size="small" onClick={() => openCheckoutDialog(v.id)}>
                            Çıkış Yap
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {view === 'past' && (
               <TableContainer>
               <Table size="small">
                 <TableHead>
                   <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>No.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>TC Kimlik No</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Ad Soyad</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Giriş Zamanı</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Çıkış Zamanı</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Ziyaret Süresi</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Ziyaretçi ID</TableCell>
                   </TableRow>
                 </TableHead>
                 <TableBody>
                   {pastVisitors.map((v, index) => (
                     <TableRow key={v.id} hover>
                       <TableCell>{index + 1}</TableCell>
                       <TableCell>{v.tc_kimlik}</TableCell>
                       <TableCell>{`${v.first_name} ${v.last_name}`}</TableCell>
                       <TableCell>{formatDateTime(v.entry_time)}</TableCell>
                       <TableCell>{v.exit_time ? formatDateTime(v.exit_time) : '-'}</TableCell>
                       <TableCell>{v.visit_duration || '-'}</TableCell>
                       <TableCell><code>{v.id}</code></TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={closeCheckoutDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Ziyaretçi Çıkışını Onayla"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Bu ziyaretçinin çıkışını yapmak istediğinize emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCheckoutDialog}>İptal</Button>
          <Button onClick={handleCheckout} color="primary" autoFocus>
            Onayla
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StaffPanel;