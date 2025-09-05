import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const data = await login(username, password);
            if (data.accessToken) {
                localStorage.setItem('authToken', data.accessToken);
                navigate('/staff-panel');
                window.location.reload();
            }
        } catch (err) {
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            console.error('Login error:', err);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Personel Girişi</h2>
            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="username">Kullanıcı Adı</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="password">Şifre</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Giriş Yap
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
