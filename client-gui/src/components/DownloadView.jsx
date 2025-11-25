import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { Download, Trash2, ShieldCheck, MoreVertical, RefreshCw, File, Terminal, Lock, Eye, EyeOff } from 'lucide-react';

function DownloadView() {
    const { success, error, warning, info } = useToast();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);

    // Passphrase Prompt State
    const [showPrompt, setShowPrompt] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/api/cloud/list');
            const data = await res.json();
            setFiles(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setOutput('Failed to load cloud files.');
            error('Failed to load cloud files.');
        } finally {
            setLoading(false);
        }
    };

    const initiateDownload = (file) => {
        setSelectedFile(file);
        setPassphrase('');
        setShowPrompt(true);
    };

    const confirmDownload = async () => {
        if (!passphrase) {
            warning("Passphrase is required to decrypt the file.");
            return;
        }
        setShowPrompt(false);

        const key = selectedFile.key;
        const originalName = selectedFile.name;

        setLoading(true);
        setOutput(`Downloading & Restoring ${originalName}...\n(Using provided passphrase)`);
        info(`Starting download for ${originalName}...`);

        try {
            const manifestPath = `http://localhost:3000/uploads/${key}`;
            const res = await fetch('http://localhost:4000/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manifestPath, passphrase })
            });
            const data = await res.json();
            setOutput(data.stdout || data.stderr || 'Download complete.');

            // Check for common CLI failure messages in stdout/stderr even if status is 200
            const outputText = (data.stdout || '') + (data.stderr || '');
            const hasError = outputText.toLowerCase().includes('error') ||
                outputText.toLowerCase().includes('failed') ||
                outputText.toLowerCase().includes('invalid');

            if (res.ok && !hasError) {
                success('File downloaded and decrypted successfully!');
            } else {
                error('Download/Decryption failed. Check passphrase.');
            }
        } catch (err) {
            setOutput(`Error: ${err.message}`);
            error(`Error: ${err.message}`);
        } finally {
            setLoading(false);
            setSelectedFile(null);
        }
    };

    const handleDelete = async (file) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${file.name}"?`)) return;

        setLoading(true);
        setOutput(`Deleting ${file.name}...`);
        try {
            const res = await fetch(`http://localhost:4000/api/cloud/file/${file.manifestName}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setOutput(`SUCCESS: Deleted ${file.name}`);
                success(`Deleted ${file.name}`);
                fetchFiles();
            } else {
                const txt = await res.text();
                setOutput(`Error deleting file: ${txt}`);
                error(`Failed to delete file: ${txt}`);
            }
        } catch (err) {
            setOutput(`Error: ${err.message}`);
            error(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (key, originalName) => {
        setLoading(true);
        setOutput(`Verifying integrity of ${originalName}...`);
        info(`Verifying ${originalName}...`);
        try {
            const manifestPath = `http://localhost:3000/uploads/${key}`;
            const res = await fetch('http://localhost:4000/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manifestPath })
            });
            const data = await res.json();
            setOutput(data.stdout || data.stderr || 'Verification complete.');
            success('Verification complete. Check logs for details.');
        } catch (err) {
            setOutput(`Error: ${err.message}`);
            error(`Verification failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleMenu = (key) => {
        setActiveMenu(activeMenu === key ? null : key);
    };

    return (
        <div className="view-container">
            <div className="header-actions">
                <h2>Cloud Files</h2>
                <button onClick={fetchFiles} className="btn secondary">
                    <RefreshCw size={16} /> Refresh List
                </button>
            </div>

            {loading && <div className="loading-bar">Processing...</div>}

            <div className="file-list">
                {files.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        <p>No files found in cloud.</p>
                        <small>Upload a file from the Backup tab to see it here.</small>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Date Uploaded</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file) => (
                                <tr key={file.key}>
                                    <td className="file-name-cell">
                                        <File size={16} className="file-icon" style={{ marginRight: '0.5rem' }} />
                                        {file.name}
                                    </td>
                                    <td>{new Date(file.lastModified).toLocaleString()}</td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={() => initiateDownload(file)}
                                            className="btn primary small"
                                        >
                                            <Download size={14} /> Download
                                        </button>

                                        <div className="menu-container">
                                            <button
                                                className="btn icon-only"
                                                onClick={() => toggleMenu(file.key)}
                                                title="More Options"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            {activeMenu === file.key && (
                                                <div className="dropdown-menu">
                                                    <button onClick={() => handleVerify(file.key, file.name)}>
                                                        <ShieldCheck size={14} style={{ marginRight: '0.5rem' }} /> Check Integrity
                                                    </button>
                                                    <button onClick={() => handleDelete(file)} className="text-danger">
                                                        <Trash2 size={14} style={{ marginRight: '0.5rem' }} /> Delete File
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="console-output-wrapper">
                <h3><Terminal size={16} /> System Output</h3>
                <div className="console-output">
                    <pre>{output}</pre>
                </div>
            </div>

            {/* Passphrase Modal */}
            {showPrompt && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Decrypt File</h3>
                        <p>Enter the passphrase for <strong>{selectedFile?.name}</strong>:</p>
                        <div className="password-input-wrapper" style={{ marginTop: '1rem' }}>
                            <div className="input-icon-wrapper" style={{ flex: 1, position: 'relative' }}>
                                <Lock size={18} className="input-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type={showPassphrase ? "text" : "password"}
                                    value={passphrase}
                                    onChange={(e) => setPassphrase(e.target.value)}
                                    placeholder="Passphrase"
                                    autoFocus
                                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                                />
                            </div>
                            <button
                                className="btn icon-only"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                            >
                                {showPassphrase ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowPrompt(false)} className="btn secondary">Cancel</button>
                            <button onClick={confirmDownload} className="btn primary">Decrypt & Download</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DownloadView;
