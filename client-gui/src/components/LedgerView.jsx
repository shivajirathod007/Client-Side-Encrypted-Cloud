import React, { useState, useEffect } from 'react';

function LedgerView() {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/ledger')
            .then(res => res.json())
            .then(data => {
                setLedger(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="view-container" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="loading-bar"></div>
            Loading ledger...
        </div>
    );

    return (
        <div className="view-container">
            <h2>Local Audit Ledger</h2>
            <div className="file-list">
                {ledger.length === 0 ? (
                    <p className="empty-state">No entries found in the ledger.</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>File Name</th>
                                <th>Merkle Root</th>
                                <th>Entry Hash</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.slice().reverse().map((entry, index) => (
                                <tr key={index}>
                                    <td>{new Date(entry.ts).toLocaleString()}</td>
                                    <td>{entry.payload.file_name}</td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--secondary)' }}>
                                        {entry.payload.merkle_root.substring(0, 16)}...
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {entry.entry_hash.substring(0, 16)}...
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default LedgerView;
