import React, { useState } from 'react';
import BackupView from './components/BackupView';
import DownloadView from './components/DownloadView';
import LedgerView from './components/LedgerView';
import CloudView from './components/CloudView';

function App() {
    const [activeTab, setActiveTab] = useState('backup');

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Secure Backup Client</h1>
                <nav>
                    <button
                        className={activeTab === 'backup' ? 'active' : ''}
                        onClick={() => setActiveTab('backup')}
                    >
                        Backup
                    </button>
                    <button
                        className={activeTab === 'download' ? 'active' : ''}
                        onClick={() => setActiveTab('download')}
                    >
                        Download Files
                    </button>
                    <button
                        className={activeTab === 'cloud' ? 'active' : ''}
                        onClick={() => setActiveTab('cloud')}
                    >
                        Cloud Admin
                    </button>
                    <button
                        className={activeTab === 'ledger' ? 'active' : ''}
                        onClick={() => setActiveTab('ledger')}
                    >
                        Ledger
                    </button>
                </nav>
            </header>
            <main className="app-content">
                {activeTab === 'backup' && <BackupView />}
                {activeTab === 'download' && <DownloadView />}
                {activeTab === 'cloud' && <CloudView />}
                {activeTab === 'ledger' && <LedgerView />}
            </main>
            <footer className="app-footer">
                <p>Secure Client-Side Encryption System &copy; 2025</p>
            </footer>
        </div>
    );
}

export default App;
