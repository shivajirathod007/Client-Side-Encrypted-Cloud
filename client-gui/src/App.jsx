import React, { useState } from 'react';
import { Upload, Cloud, Shield, FileText, Download } from 'lucide-react';
import { ToastProvider } from './context/ToastContext';
import BackupView from './components/BackupView';
import DownloadView from './components/DownloadView';
import LedgerView from './components/LedgerView';
import CloudView from './components/CloudView';

function AppContent() {
    const [activeTab, setActiveTab] = useState('backup');

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Secure Backup Client</h1>
                <nav>
                    <button
                        className={`nav-btn ${activeTab === 'backup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('backup')}
                    >
                        <Upload size={18} className="nav-icon" />
                        Backup
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'download' ? 'active' : ''}`}
                        onClick={() => setActiveTab('download')}
                    >
                        <Download size={18} className="nav-icon" />
                        Download
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'cloud' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cloud')}
                    >
                        <Cloud size={18} className="nav-icon" />
                        Cloud Admin
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'ledger' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ledger')}
                    >
                        <FileText size={18} className="nav-icon" />
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

function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}

export default App;
