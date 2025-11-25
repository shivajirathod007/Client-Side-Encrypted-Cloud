import React, { useState, useEffect } from 'react';

function DownloadView() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);

    // Passphrase Prompt State
    const [showPrompt, setShowPrompt] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [passphrase, setPassphrase] = useState('');

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
            alert("Passphrase is required to decrypt the file.");
            return;
        }
        setShowPrompt(false);

        const key = selectedFile.key;
        const originalName = selectedFile.name;

        setLoading(true);
        setOutput(`Downloading & Restoring ${originalName}...\n(Using provided passphrase)`);
        try {
            const manifestPath = `http://localhost:3000/uploads/${key}`;
            const res = await fetch('http://localhost:4000/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manifestPath, passphrase })
            });
            const data = await res.json();
            setOutput(data.stdout || data.stderr || 'Download complete.');
        } catch (err) {
            setOutput(`Error: ${err.message}`);
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
            // file.manifestName is the actual filename on server (manifest_....json)
            const res = await fetch(`http://localhost:4000/api/cloud/file/${file.manifestName}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setOutput(`SUCCESS: Deleted ${file.name}`);
                fetchFiles(); // Refresh list
            } else {
                const txt = await res.text();
                setOutput(`Error deleting file: ${txt}`);
            }
        } catch (err) {
            setOutput(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (key, originalName) => {
        setLoading(true);
        setOutput(`Verifying integrity of ${originalName}...`);
        try {
            const manifestPath = `http://localhost:3000/uploads/${key}`;
            const res = await fetch('http://localhost:4000/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manifestPath })
            });
            const data = await res.json();
            setOutput(data.stdout || data.stderr || 'Verification complete.');
        } catch (err) {
            setOutput(`Error: ${err.message}`);
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
                <button onClick={fetchFiles} className="btn secondary">Refresh List</button>
            </div>

            {loading && <div className="loading-bar">Processing...</div>}

            <div className="file-list">
                {files.length === 0 ? (
                    <div className="empty-state">
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
                                        <span className="file-icon">📄</span>
                                        {file.name}
                                    </td>
                                    <td>{new Date(file.lastModified).toLocaleString()}</td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={() => initiateDownload(file)}
                                            className="btn primary"
                                        >
                                            Download
                                        </button>

                                        <div className="menu-container">
                                            <button
                                                className="btn icon-only"
                                                onClick={() => toggleMenu(file.key)}
                                                title="More Options"
                                            >
                                                ⋮
                                            </button>
                                            {activeMenu === file.key && (
                                                <div className="dropdown-menu">
                                                    <button onClick={() => handleVerify(file.key, file.name)}>
                                                        🛡️ Check Integrity
                                                    </button>
                                                    <button onClick={() => handleDelete(file)} className="text-danger">
                                                        🗑️ Delete File
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

            <div className="console-output">
                <h3>System Output</h3>
                <pre>{output}</pre>
            </div>

            {/* Passphrase Modal */}
            {showPrompt && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Decrypt File</h3>
                        <p>Enter the passphrase for <strong>{selectedFile?.name}</strong>:</p>
                        <input
                            type="password"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder="Passphrase"
                            autoFocus
                        />
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
