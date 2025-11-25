import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { File, Lock, Eye, EyeOff, Play, FolderOpen, Terminal } from 'lucide-react';

function BackupView() {
    const { success, error, warning, info } = useToast();
    const [file, setFile] = useState(null);
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [chunkSize, setChunkSize] = useState(16);
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const consoleRef = useRef(null);

    // Auto-scroll console
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [output]);

    const handleBrowse = async () => {
        try {
            const res = await fetch('http://localhost:4000/api/browse');
            const data = await res.json();
            if (data.filePath) {
                setFile(data.filePath);
                info(`Selected file: ${data.filePath.split(/[\\/]/).pop()}`);
            }
        } catch (err) {
            console.error(err);
            error('Failed to open file dialog');
        }
    };

    const handleBackup = async () => {
        if (!file) {
            warning('Please select a file first.');
            return;
        }
        if (!passphrase.trim()) {
            warning('Encryption Passphrase is MANDATORY.');
            return;
        }

        setLoading(true);
        setOutput(prev => prev + `\n> Starting backup for: ${file}...\n`);
        info('Starting backup process...');

        try {
            const res = await fetch('http://localhost:4000/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: file, chunkSize, passphrase })
            });
            const data = await res.json();
            setOutput(prev => prev + (data.stdout || '') + (data.stderr || ''));

            if (res.ok) {
                setOutput(prev => prev + '\n[SUCCESS] Backup completed successfully.\n');
                success('Backup completed successfully!');
                setFile(null);
                setPassphrase('');
            } else {
                setOutput(prev => prev + '\n[ERROR] Backup failed.\n');
                error('Backup failed. Check logs.');
            }
        } catch (err) {
            setOutput(prev => prev + `\n[ERROR] Request failed: ${err.message}\n`);
            error(`Request failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="view-container">
            <h2>Secure Backup</h2>

            <div className="form-group">
                <label>Select File to Encrypt & Backup</label>
                <div className="file-input-wrapper">
                    <div className="input-icon-wrapper" style={{ flex: 1, position: 'relative' }}>
                        <File size={18} className="input-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            value={file || ''}
                            placeholder="No file selected"
                            readOnly
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <button onClick={handleBrowse} className="btn secondary">
                        <FolderOpen size={18} /> Browse
                    </button>
                </div>
            </div>

            <div className="form-group">
                <label>Encryption Passphrase <span className="required">*</span></label>
                <div className="password-input-wrapper">
                    <div className="input-icon-wrapper" style={{ flex: 1, position: 'relative' }}>
                        <Lock size={18} className="input-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type={showPassphrase ? "text" : "password"}
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder="Enter a strong passphrase"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <button
                        className="btn icon-only"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        title={showPassphrase ? "Hide Passphrase" : "Show Passphrase"}
                    >
                        {showPassphrase ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <div className="form-group">
                <label>Chunk Size (MB)</label>
                <input
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(parseInt(e.target.value))}
                    min="1"
                    max="1024"
                />
            </div>

            <button
                onClick={handleBackup}
                className="btn primary full-width"
                disabled={loading}
                style={{ width: '100%', marginTop: '1rem' }}
            >
                {loading ? 'Processing...' : <><Play size={18} /> Start Secure Backup</>}
            </button>

            <div className="console-output-wrapper">
                <h3><Terminal size={16} /> CLI Activity Log</h3>
                <div className="console-output" ref={consoleRef}>
                    <pre>{output || "Waiting for user action..."}</pre>
                </div>
            </div>
        </div>
    );
}

export default BackupView;
