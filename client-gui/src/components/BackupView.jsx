import React, { useState, useRef, useEffect } from 'react';

function BackupView() {
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
            if (data.filePath) setFile(data.filePath);
        } catch (err) {
            console.error(err);
        }
    };

    const handleBackup = async () => {
        if (!file) {
            alert('Please select a file first.');
            return;
        }
        if (!passphrase.trim()) {
            alert('Encryption Passphrase is MANDATORY.');
            return;
        }

        setLoading(true);
        setOutput(prev => prev + `\n> Starting backup for: ${file}...\n`);

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
            } else {
                setOutput(prev => prev + '\n[ERROR] Backup failed.\n');
            }
        } catch (err) {
            setOutput(prev => prev + `\n[ERROR] Request failed: ${err.message}\n`);
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
                    <input
                        type="text"
                        value={file || ''}
                        placeholder="No file selected"
                        readOnly
                    />
                    <button onClick={handleBrowse} className="btn secondary">Browse</button>
                </div>
            </div>

            <div className="form-group">
                <label>Encryption Passphrase <span className="required">*</span></label>
                <div className="password-input-wrapper">
                    <input
                        type={showPassphrase ? "text" : "password"}
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Enter a strong passphrase"
                    />
                    <button
                        className="btn icon-only"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        title={showPassphrase ? "Hide Passphrase" : "Show Passphrase"}
                    >
                        {showPassphrase ? "👁️" : "👁️‍🗨️"}
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
            >
                {loading ? 'Processing...' : 'Start Secure Backup'}
            </button>

            <div className="console-output-wrapper">
                <h3>CLI Activity Log</h3>
                <div className="console-output" ref={consoleRef}>
                    <pre>{output || "Waiting for user action..."}</pre>
                </div>
            </div>
        </div>
    );
}

export default BackupView;
