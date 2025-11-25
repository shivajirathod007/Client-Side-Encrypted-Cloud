import React, { useState } from 'react';

function VerifyView() {
    const [manifestPath, setManifestPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState('');
    const [status, setStatus] = useState(null);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setOutput('');
        setStatus(null);

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manifestPath })
            });
            const data = await res.json();

            if (data.error) {
                setOutput(`Error: ${data.error}\n${data.stderr || ''}`);
                setStatus('error');
            } else {
                setOutput(data.stdout);
                setStatus('success');
            }
        } catch (err) {
            setOutput(`Request failed: ${err.message}`);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="view-container">
            <h2>Verify Backup Integrity</h2>
            <form onSubmit={handleVerify}>
                <div className="form-group">
                    <label>Manifest Path or URL</label>
                    <input
                        type="text"
                        value={manifestPath}
                        onChange={(e) => setManifestPath(e.target.value)}
                        placeholder="http://localhost:3000/uploads/manifests/..."
                        required
                    />
                </div>
                <button type="submit" className="btn primary" disabled={loading}>
                    {loading ? 'Verifying...' : 'Run Verification'}
                </button>
            </form>

            {output && (
                <div className="console-output">
                    <h3>Console Output</h3>
                    <pre style={{ color: status === 'error' ? '#f87171' : '#4ade80' }}>
                        {output}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default VerifyView;
