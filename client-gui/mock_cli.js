const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Need to install axios or use fetch
const FormData = require('form-data');

// Mock CLI arguments: [node, script, command, file, chunk_size]
const args = process.argv.slice(2);
const command = args[0];

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
    runRestore(manifestPath, outputDir);
} else {
    console.log("Usage: mock_cli <backup|verify|restore> <args>");
}

async function runBackup(filePath, chunkSizeMB) {
    console.log(`[MockCLI] Starting backup for: ${filePath}`);
    console.log(`[MockCLI] Chunk size: ${chunkSizeMB} MB`);

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
        const manifest = {
            file_name: path.basename(filePath),
            version: 1,
            chunks: []
        };

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSizeBytes;
            const end = Math.min(start + chunkSizeBytes, fileSize);
            const chunkData = fileBuffer.slice(start, end);

            console.log(`[MockCLI] Processing chunk ${i + 1}/${totalChunks}...`);

            // Upload chunk
            const form = new FormData();
            // Generate a random/encrypted filename for the cloud
            const obfuscatedName = `enc_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`;

            form.append('chunk', chunkData, { filename: obfuscatedName });

            // Assuming server is running on 3000
            await axios.post('http://localhost:3000/upload/chunk', form, {
                headers: form.getHeaders()
            });

            manifest.chunks.push({
                id: i,
                hash: `mock_hash_${i}`, // Dummy hash
                iv: `mock_iv_${i}`,
                cloud_key: `chunks/${obfuscatedName}`, // Store the obfuscated key
                uri: `http://localhost:3000/uploads/chunks/${obfuscatedName}`
            });
        }

        // Upload Manifest
        console.log(`[MockCLI] Uploading manifest...`);
        const res = await axios.post('http://localhost:3000/upload/manifest', manifest);

        console.log(`[MockCLI] Backup Complete!`);
        console.log(`[MockCLI] Manifest URL: ${res.data.url}`);

        // Append to local ledger (simulated)
        const ledgerPath = path.resolve(__dirname, '../data/ledger.json');
        let ledger = [];
        if (fs.existsSync(ledgerPath)) {
            const fileContent = fs.readFileSync(ledgerPath, 'utf8').trim();
            if (fileContent) {
                try {
                    ledger = JSON.parse(fileContent);
                } catch (e) {
                    console.warn("[MockCLI] Warning: Corrupted ledger, starting fresh.");
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

        process.exit(0); // Success

    } catch (err) {
        console.error(`[MockCLI] Error: ${err.message}`);
        process.exit(1);
    }
}

async function runVerify(manifestPath) {
    console.log(`[MockCLI] Verifying manifest: ${manifestPath}`);
    console.log(`[MockCLI] Downloading manifest...`);
    // Simulate verification
    setTimeout(() => {
        console.log(`[MockCLI] Manifest verified.`);
        console.log(`[MockCLI] Downloading chunks...`);
        console.log(`[MockCLI] Recomputing Merkle Root...`);
        console.log(`[MockCLI] SUCCESS: Backup verified successfully. Integrity Check Passed.`);
    }, 1000);
}

async function runRestore(manifestPath, outputDir) {
    console.log(`[MockCLI] Restoring from manifest: ${manifestPath}`);

    try {
        // 1. Fetch Manifest
        console.log(`[MockCLI] Fetching manifest...`);
        const manifestRes = await axios.get(manifestPath);
        const manifest = manifestRes.data;

        if (!manifest.chunks || !Array.isArray(manifest.chunks)) {
            throw new Error("Invalid manifest format: 'chunks' array missing.");
        }

        console.log(`[MockCLI] Found ${manifest.chunks.length} chunks for file: ${manifest.file_name}`);

        // 2. Download Chunks
        const chunkBuffers = [];
        for (const chunk of manifest.chunks) {
            // Construct chunk URL. 
            // manifest.chunks[i].cloud_key is like "chunks/enc_..."
            // Server serves uploads at http://localhost:3000/uploads/
            // So we need http://localhost:3000/uploads/chunks/enc_...
            // But wait, server serves 'uploads' static folder. 
            // If key is 'chunks/foo.bin', url is '.../uploads/chunks/foo.bin'

            // We can use the 'uri' from manifest if it exists and is correct, 
            // OR construct it from 'cloud_key' which is safer if URI is stale/local.
            // Let's rely on the server proxy: http://localhost:3000/uploads/<cloud_key>

            const chunkUrl = `http://localhost:3000/uploads/${chunk.cloud_key}`;
            console.log(`[MockCLI] Downloading chunk ${chunk.id + 1}/${manifest.chunks.length}: ${chunk.cloud_key}...`);

            const chunkRes = await axios.get(chunkUrl, { responseType: 'arraybuffer' });
            chunkBuffers.push(chunkRes.data);
        }

        // 3. Reassemble
        console.log(`[MockCLI] Reassembling file...`);
        const fileBuffer = Buffer.concat(chunkBuffers);

        // 4. Write to Disk
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const restoredFileName = `restored_${manifest.file_name}`;
        const restoredPath = path.join(outputDir, restoredFileName);
        fs.writeFileSync(restoredPath, fileBuffer);

        console.log(`[MockCLI] SUCCESS: File restored to ${restoredPath}`);
        console.log(`[MockCLI] Original Size: ${fileBuffer.length} bytes`);

        process.exit(0);

    } catch (err) {
        console.error(`[MockCLI] Restore Error: ${err.message}`);
        process.exit(1);
    }
}
