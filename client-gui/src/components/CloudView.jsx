import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { ShieldAlert, Trash2, LogOut, Lock, Unlock, Terminal, AlertTriangle } from 'lucide-react';

function CloudView() {
    const { success, error, warning, info } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Hardcoded for demo purposes
        if (password === 'admin123') {
            setIsAuthenticated(true);
            success('Admin access granted.');
        } else {
            error('Invalid Admin Password');
        }
    };

    const handleWipe = async () => {
        if (!window.confirm('WARNING: This will PERMANENTLY DELETE ALL DATA from the cloud. This action cannot be undone. Are you sure?')) return;

        setLoading(true);
        setOutput('Wiping cloud storage...');
        info('Initiating cloud wipe...');

        try {
            const res = await fetch('http://localhost:4000/api/cloud/wipe', { method: 'DELETE' });
            if (res.ok) {
                setOutput('SUCCESS: Cloud storage wiped completely.');
                success('Cloud storage wiped successfully.');
            } else {
                setOutput('Error wiping storage.');
                error('Failed to wipe cloud storage.');
            }
        } catch (err) {
            setOutput(`Error: ${err.message}`);
            error(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="view-container centered-content">
                <div className="login-card">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#06b6d4' }}>
                        <Lock size={48} />
                    </div>
                    <h2>Cloud Admin Access</h2>
                    <p>Please enter the admin password to access restricted cloud operations.</p>
                    <form onSubmit={handleLogin} className="login-form">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Admin Password"
                            autoFocus
                        />
                        <button type="submit" className="btn primary full-width">
                            <Unlock size={18} /> Unlock
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="view-container">
            <div className="header-actions">
                <h2>Cloud Administration</h2>
                <button onClick={() => setIsAuthenticated(false)} className="btn secondary">
                    <LogOut size={18} /> Logout
                </button>
            </div>

            <div className="admin-panel">
                <div className="danger-zone">
                    <h3><AlertTriangle size={20} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Danger Zone</h3>
                    <p>These actions are destructive and irreversible.</p>

                    <button onClick={handleWipe} className="btn danger large-btn" disabled={loading}>
                        {loading ? 'Wiping...' : <><Trash2 size={20} /> Wipe ALL Cloud Data</>}
                    </button>
                </div>

                <div className="console-output-wrapper">
                    <h3><Terminal size={16} /> System Output</h3>
                    <div className="console-output">
                        <pre>{output || "Ready for admin commands..."}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CloudView;
