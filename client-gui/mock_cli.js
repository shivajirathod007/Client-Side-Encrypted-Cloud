const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

// Mock CLI arguments: [node, script, command, file, chunk_size]
const args = process.argv.slice(2);
const command = args[0];

// Helper to read passphrase from stdin
async function readPassphrase() {
    return new Promise((resolve) => {
        let data = '';
        const stdin = process.stdin;
        if (stdin.isTTY) {
            resolve('default_pass'); // Fallback if not piped
            return;
        }
        stdin.setEncoding('utf8');
        stdin.on('data', chunk => data += chunk);
        stdin.on('end', () => resolve(data.trim()));
        stdin.on('error', () => resolve('default_pass'));
    });
}

if (command === 'backup') {
    const filePath = args[1];
    const chunkSizeMB = parseInt(args[2]) || 16;
    runBackup(filePath, chunkSizeMB);
} else if (command === 'verify') {
    const manifestPath = args[1];
    runVerify(manifestPath);
} else if (command === 'restore') {
    const manifestPath = args[1];
    const outputDir = args[2];
    // Note: server.js passes passphrase via stdin, not args
    runRestore(manifestPath, outputDir);
} else {
    console.log("Usage: mock_cli <backup|verify|restore> <args>");
}

async function runBackup(filePath, chunkSizeMB) {
    console.log(`[MockCLI] Starting backup for: ${filePath}`);
    const passphrase = await readPassphrase();
    console.log(`[MockCLI] Using passphrase: ${'*'.repeat(passphrase.length)}`);

    if (!fs.existsSync(filePath)) {
        console.error(`[MockCLI] Error: File not found: ${filePath}`);
        process.exit(1);
    }

    try {
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const chunkSizeBytes = chunkSizeMB * 1024 * 1024;
        const totalChunks = Math.ceil(fileSize / chunkSizeBytes);

        console.log(`[MockCLI] File size: ${fileSize} bytes. Total chunks: ${totalChunks}`);

        const fileBuffer = fs.readFileSync(filePath);

        // Simulate Key Derivation and Auth Tag
        const mockAuthTag = crypto.createHash('sha256').update(passphrase).digest('hex');

        const manifest = {
            file_name: path.basename(filePath),
            version: 1,
            mock_auth_tag: mockAuthTag, // Store hash for validation
            chunks: []
        };

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSizeBytes;
            const end = Math.min(start + chunkSizeBytes, fileSize);
            const chunkData = fileBuffer.slice(start, end);

            console.log(`[MockCLI] Processing chunk ${i + 1}/${totalChunks}...`);

            // Upload chunk
            const form = new FormData();
            const obfuscatedName = `enc_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`;

            form.append('chunk', chunkData, { filename: obfuscatedName });

            await axios.post('http://localhost:3000/upload/chunk', form, {
                headers: form.getHeaders()
            });

            manifest.chunks.push({
                id: i,
                hash: `mock_hash_${i}`,
                iv: `mock_iv_${i}`,
                cloud_key: `chunks/${obfuscatedName}`,
                uri: `http://localhost:3000/uploads/chunks/${obfuscatedName}`
            });
        }

        // Upload Manifest
        console.log(`[MockCLI] Uploading manifest...`);
        const res = await axios.post('http://localhost:3000/upload/manifest', manifest);

        console.log(`[MockCLI] Backup Complete!`);
        console.log(`[MockCLI] Manifest URL: ${res.data.url}`);

        // Append to local ledger
        const ledgerPath = path.resolve(__dirname, '../data/ledger.json');
        let ledger = [];
        if (fs.existsSync(ledgerPath)) {
            const fileContent = fs.readFileSync(ledgerPath, 'utf8').trim();
            if (fileContent) {
                try {
                    ledger = JSON.parse(fileContent);
                } catch (e) {
                    ledger = [];
                }
            }
        }
        ledger.push({
            ts: new Date().toISOString(),
            entry_hash: `mock_entry_hash_${Date.now()}`,
            payload: {
                file_name: manifest.file_name,
                version: 1,
                merkle_root: "mock_merkle_root"
            }
        });
        fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

        process.exit(0);

    } catch (err) {
        console.error(`[MockCLI] Error: ${err.message}`);
        process.exit(1);
    }
}

async function runVerify(manifestPath) {
    console.log(`[MockCLI] Verifying manifest: ${manifestPath}`);
    setTimeout(() => {
        console.log(`[MockCLI] SUCCESS: Backup verified successfully.`);
    }, 1000);
}

async function runRestore(manifestPath, outputDir) {
    console.log(`[MockCLI] Restoring from manifest: ${manifestPath}`);
    const passphrase = await readPassphrase();
    console.log(`[MockCLI] Using passphrase: ${'*'.repeat(passphrase.length)}`);

    try {
        // 1. Fetch Manifest
        console.log(`[MockCLI] Fetching manifest...`);
        const manifestRes = await axios.get(manifestPath);
        const manifest = manifestRes.data;

        // 2. Validate Passphrase (Mock)
        if (manifest.mock_auth_tag) {
            const inputHash = crypto.createHash('sha256').update(passphrase).digest('hex');
            if (inputHash !== manifest.mock_auth_tag) {
                throw new Error("Decryption failed: Invalid passphrase (Mock Validation)");
            }
            console.log("[MockCLI] Passphrase validated successfully.");
        } else {
            console.warn("[MockCLI] Warning: Old backup without auth tag. Skipping validation.");
        }

        if (!manifest.chunks || !Array.isArray(manifest.chunks)) {
            throw new Error("Invalid manifest format: 'chunks' array missing.");
        }

        console.log(`[MockCLI] Found ${manifest.chunks.length} chunks for file: ${manifest.file_name}`);

        // 3. Download Chunks
        const chunkBuffers = [];
        for (const chunk of manifest.chunks) {
            const chunkUrl = `http://localhost:3000/uploads/${chunk.cloud_key}`;
            console.log(`[MockCLI] Downloading chunk ${chunk.id + 1}/${manifest.chunks.length}...`);
            const chunkRes = await axios.get(chunkUrl, { responseType: 'arraybuffer' });
            chunkBuffers.push(chunkRes.data);
        }

        // 4. Reassemble
        console.log(`[MockCLI] Reassembling file...`);
        const fileBuffer = Buffer.concat(chunkBuffers);

        // 5. Write to Disk
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const restoredFileName = `restored_${manifest.file_name}`;
        const restoredPath = path.join(outputDir, restoredFileName);
        fs.writeFileSync(restoredPath, fileBuffer);

        console.log(`[MockCLI] SUCCESS: File restored to ${restoredPath}`);
        process.exit(0);

    } catch (err) {
        console.error(`[MockCLI] Restore Error: ${err.message}`);
        process.exit(1);
    }
}
