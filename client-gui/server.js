const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4000; // GUI runs on 4000, Upload Server on 3000

app.use(cors());
app.use(express.json());

// Path to CLI executable
// Adjust based on build location (Release/Debug/Linux/Windows)
let cliPath = path.resolve(__dirname, '../build/Release/secure_backup_cli.exe');
let useMock = false;

if (!fs.existsSync(cliPath)) {
    console.warn("WARNING: C++ CLI not found. Using Mock CLI (Node.js) for demonstration.");
    cliPath = `node "${path.resolve(__dirname, 'mock_cli.js')}"`;
    useMock = true;
} else {
    cliPath = `"${cliPath}"`;
}

// API: List Ledger
app.get('/api/ledger', (req, res) => {
    const ledgerPath = path.resolve(__dirname, '../data/ledger.json');
    if (fs.existsSync(ledgerPath)) {
        try {
            const data = fs.readFileSync(ledgerPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: 'Failed to read ledger' });
        }
    } else {
        res.json([]);
    }
});

// API: Run Backup
app.post('/api/backup', (req, res) => {
    const { filePath, chunkSize } = req.body;
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    // Note: Passphrase handling is tricky via CLI interactive input.
    // For this GUI, we might need to modify CLI to accept passphrase via env var or arg,
    // OR we pipe it to stdin.
    const passphrase = req.body.passphrase || 'default_pass';

    // Command: echo passphrase | cli backup file chunk_size
    // Windows: (echo passphrase) | cli ...

    let cmd;
    // Always pipe passphrase to CLI (Mock or Real)
    cmd = `(echo ${passphrase}) | ${cliPath} backup "${filePath}" ${chunkSize || 16}`;

    console.log(`Executing: ${cmd}`);

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message, stderr });
        }
        res.json({ stdout, stderr });
    });
});

// API: Verify
app.post('/api/verify', (req, res) => {
    const { manifestPath } = req.body;
    if (!manifestPath) return res.status(400).json({ error: 'Manifest path required' });

    const cmd = `${cliPath} verify "${manifestPath}"`;

    console.log(`Executing: ${cmd}`);

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message, stderr });
        }
        res.json({ stdout, stderr });
    });
});

// API: Browse File (Windows only implementation for now)
app.get('/api/browse', (req, res) => {
    const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.OpenFileDialog
        $f.InitialDirectory = [Environment]::GetFolderPath('Desktop')
        $f.Filter = "All Files (*.*)|*.*"
        if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            Write-Output $f.FileName
        }
    `;

    // Use Base64 encoding to avoid shell escaping issues
    const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');
    // IMPORTANT: -STA is required for Windows Forms dialogs to work correctly
    const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -STA -EncodedCommand "${encodedCommand}"`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error('Browse error:', error);
            return res.status(500).json({ error: 'Failed to open dialog' });
        }
        const filePath = stdout.trim();
        res.json({ filePath });
    });
});

// Cloud Proxy: List
app.get('/api/cloud/list', async (req, res) => {
    try {
        const axios = require('axios');
        const response = await axios.get('http://localhost:3000/cloud/list');
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch cloud list' });
    }
});

// Cloud Proxy: Wipe
app.delete('/api/cloud/wipe', async (req, res) => {
    try {
        const axios = require('axios');
        await axios.delete('http://localhost:3000/cloud/wipe');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to wipe cloud data' });
    }
});

// Cloud Proxy: Delete Single File
app.delete('/api/cloud/file/:manifestName', async (req, res) => {
    try {
        const axios = require('axios');
        const manifestName = req.params.manifestName;
        await axios.delete(`http://localhost:3000/cloud/file/${manifestName}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// API: Restore (Download & Decrypt)
app.post('/api/restore', (req, res) => {
    const { manifestPath, outputDir, passphrase } = req.body;

    // Default to a 'Restored' folder on Desktop for visibility
    const defaultDir = path.join(require('os').homedir(), 'Desktop', 'Restored');
    const targetDir = outputDir || defaultDir;

    // Ensure dir exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Pass passphrase to CLI (Mock CLI will just log it for now)
    // In real CLI, we'd pipe it like backup
    let cmd;
    // Always pipe passphrase to CLI (Mock or Real)
    cmd = `(echo ${passphrase}) | ${cliPath} restore "${manifestPath}" "${targetDir}"`;

    console.log(`Executing: ${cmd}`);

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message, stderr });
        }
        res.json({ stdout, stderr });
    });
});

app.listen(port, () => {
    console.log(`GUI Middleware running at http://localhost:${port}`);
});
