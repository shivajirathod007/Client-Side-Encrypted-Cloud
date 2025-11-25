import React, { useState, useEffect } from 'react';
import { FileText, Hash, Clock, Database } from 'lucide-react';

function LedgerView() {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:4000/api/ledger')
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
        <div className="view-container" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="loading-bar"></div>
            <p style={{ marginTop: '1rem' }}>Loading ledger...</p>
        </div>
    );

    return (
        <div className="view-container">
            <div className="header-actions">
                <h2><Database size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> Local Audit Ledger</h2>
            </div>

            <div className="file-list">
                {ledger.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        <p>No entries found in the ledger.</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th><Clock size={14} style={{ marginRight: '0.3rem' }} /> Timestamp</th>
                                <th><FileText size={14} style={{ marginRight: '0.3rem' }} /> File Name</th>
                                <th><Hash size={14} style={{ marginRight: '0.3rem' }} /> Merkle Root</th>
                                <th><Hash size={14} style={{ marginRight: '0.3rem' }} /> Entry Hash</th>
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
