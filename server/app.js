const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const app = express();
const port = 3000;

// B2 Configuration
const s3 = new S3Client({
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  region: 'us-east-005',
  credentials: {
    accessKeyId: '005168d609698850000000001',
    secretAccessKey: 'K005lacvHPNLSIk1JOcz4jRYe1vlqfE'
  }
});
const BUCKET_NAME = 'Client-Side-Encryption';

// Ensure uploads directory exists for temporary storage
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MANIFEST_DIR = path.join(__dirname, 'uploads', 'manifests');
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(MANIFEST_DIR);

// Configure Multer for temp storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

app.use((req, res, next) => {
  console.log(`[B2] Incoming Request: ${req.method} ${req.url}`);
  next();
});

// Helper to stream from S3 to local file
async function downloadFromB2(key, localPath) {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  try {
    console.log(`[B2] Fetching from cloud: ${key}`);
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const response = await s3.send(command);

    // Ensure parent dir exists
    await fs.ensureDir(path.dirname(localPath));

    // Pipe to file
    const writeStream = fs.createWriteStream(localPath);
    return new Promise((resolve, reject) => {
      response.Body.pipe(writeStream)
        .on('error', reject)
        .on('finish', resolve);
    });
  } catch (err) {
    console.error(`[B2] Download Failed for ${key}:`, err.message);
    throw err;
  }
}

// Route for Manifests with B2 Fallback
app.get('/uploads/manifests/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(MANIFEST_DIR, filename);

  console.log(`[B2] Request Manifest: ${filename}`);

  if (fs.existsSync(filePath)) {
    console.log(`[Cache] Hit: ${filename}`);
    return res.sendFile(filePath);
  }

  console.log(`[Cache] Miss: ${filename}. Attempting B2 fetch...`);
  try {
    await downloadFromB2(`manifests/${filename}`, filePath);
    console.log(`[Cache] Restored: ${filename}`);
    res.sendFile(filePath);
  } catch (err) {
    console.error(`[B2] Manifest Not Found: ${filename}`);
    res.status(404).send('File not found in local cache or cloud.');
  }
});

// Route for Chunks with B2 Fallback
app.get('/uploads/chunks/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, 'chunks', filename);

  console.log(`[B2] Request Chunk: ${filename}`);

  if (fs.existsSync(filePath)) {
    console.log(`[Cache] Hit: ${filename}`);
    return res.sendFile(filePath);
  }

  // Check alt path (root uploads) just in case
  const altPath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(altPath)) {
    console.log(`[Cache] Hit (Alt): ${filename}`);
    return res.sendFile(altPath);
  }

  console.log(`[Cache] Miss: ${filename}. Attempting B2 fetch...`);
  try {
    await downloadFromB2(`chunks/${filename}`, filePath);
    console.log(`[Cache] Restored: ${filename}`);
    res.sendFile(filePath);
  } catch (err) {
    console.error(`[B2] Chunk Not Found: ${filename}`);
    res.status(404).send('File not found in local cache or cloud.');
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// Helper to upload to B2
async function uploadToB2(filePath, key) {
  const fileStream = fs.createReadStream(filePath);
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileStream
    }
  });
  await upload.done();
}

// Upload Chunk Endpoint
app.post('/upload/chunk', upload.single('chunk'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const key = `chunks/${req.file.originalname}`;
    console.log(`[B2] Uploading chunk: ${key}`);
    await uploadToB2(req.file.path, key);
    res.send(`Chunk uploaded to B2: ${req.file.originalname}`);
  } catch (err) {
    console.error('[B2] Upload Error:', err);
    res.status(500).send('Failed to upload to cloud');
  }
});

// Upload Manifest Endpoint
app.post('/upload/manifest', async (req, res) => {
  const manifest = req.body;
  const filename = `manifest_${Date.now()}.json`;
  const filePath = path.join(MANIFEST_DIR, filename);

  try {
    await fs.writeJson(filePath, manifest);
    const key = `manifests/${filename}`;
    console.log(`[B2] Uploading manifest: ${key}`);
    await uploadToB2(filePath, key);

    const proxyUrl = `http://localhost:${port}/uploads/manifests/${filename}`;
    res.json({ url: proxyUrl });
  } catch (err) {
    console.error('[B2] Manifest Error:', err);
    res.status(500).send('Failed to save manifest');
  }
});

// List Cloud Files (Manifests)
app.get('/cloud/list', async (req, res) => {
  console.log('[B2] Request: List Files (Prefix: manifests/)');
  try {
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'manifests/'
    });
    const response = await s3.send(command);
    console.log('[B2] Response (List):', JSON.stringify(response.Contents?.length || 0, null, 2));

    // Helper to read stream
    const streamToString = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      });

    const { GetObjectCommand } = require('@aws-sdk/client-s3');

    // Map to simpler format and enrich with local metadata if available
    const files = await Promise.all((response.Contents || []).map(async (item) => {
      const filename = path.basename(item.Key);
      const localPath = path.join(MANIFEST_DIR, filename);
      let originalName = filename;

      // 1. Try local cache first
      if (await fs.pathExists(localPath)) {
        try {
          const manifest = await fs.readJson(localPath);
          if (manifest.file_name) originalName = manifest.file_name;
        } catch (e) {
          console.warn(`Failed to read local manifest: ${filename}`);
        }
      }
      // 2. If not local, fetch from Cloud (B2) and restore cache
      else {
        try {
          console.log(`[B2] Fetching missing manifest from cloud: ${item.Key}`);
          const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: item.Key });
          const getRes = await s3.send(getCmd);
          const bodyContents = await streamToString(getRes.Body);
          const manifest = JSON.parse(bodyContents);

          if (manifest.file_name) originalName = manifest.file_name;

          // Restore to local cache for future speed
          await fs.outputJson(localPath, manifest);
        } catch (e) {
          console.warn(`Failed to fetch/parse cloud manifest: ${filename}`, e.message);
        }
      }

      return {
        key: item.Key,
        lastModified: item.LastModified,
        size: item.Size,
        name: originalName, // Display name
        manifestName: filename // Technical name
      };
    }));

    res.json(files);
  } catch (err) {
    console.error('[B2] List Error:', err);
    res.status(500).send('Failed to list cloud files');
  }
});

// Delete Single File (Manifest + Chunks)
app.delete('/cloud/file/:manifestName', async (req, res) => {
  const manifestName = req.params.manifestName;
  console.log(`[B2] Request: Delete File ${manifestName}`);

  try {
    const { DeleteObjectsCommand } = require('@aws-sdk/client-s3');

    // 1. Get Manifest Content (try local first, else fetch from cloud)
    const localManifestPath = path.join(MANIFEST_DIR, manifestName);
    let manifest = null;

    if (await fs.pathExists(localManifestPath)) {
      manifest = await fs.readJson(localManifestPath);
    } else {
      // Fetch from cloud if not local (simplified: assume local for now as we upload there)
      // In a real app, we'd fetch s3://manifests/manifestName
      console.warn('[B2] Local manifest not found, proceeding with blind manifest deletion (chunks might remain orphan).');
    }

    const objectsToDelete = [];

    // 2. Add Chunks to delete list
    if (manifest && manifest.chunks) {
      manifest.chunks.forEach(chunk => {
        if (chunk.cloud_key) {
          objectsToDelete.push({ Key: chunk.cloud_key });
        }
      });
    }

    // 3. Add Manifest itself
    objectsToDelete.push({ Key: `manifests/${manifestName}` });

    if (objectsToDelete.length > 0) {
      console.log(`[B2] Deleting ${objectsToDelete.length} objects...`);
      const deleteParams = {
        Bucket: BUCKET_NAME,
        Delete: { Objects: objectsToDelete }
      };
      const deleteCmd = new DeleteObjectsCommand(deleteParams);
      await s3.send(deleteCmd);
    }

    // 4. Cleanup Local
    if (await fs.pathExists(localManifestPath)) {
      await fs.remove(localManifestPath);
    }

    res.send(`File ${manifestName} and its chunks deleted successfully.`);

  } catch (err) {
    console.error('[B2] Delete File Error:', err);
    res.status(500).send('Failed to delete file');
  }
});

// Wipe Cloud Data (Hard Wipe - Deletes All Versions)
app.delete('/cloud/wipe', async (req, res) => {
  console.log('[B2] Request: Wipe All Data (Hard Wipe)');
  try {
    const { ListObjectVersionsCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

    let isTruncated = true;
    let keyMarker = undefined;
    let versionIdMarker = undefined;
    let totalDeleted = 0;

    while (isTruncated) {
      const listCmd = new ListObjectVersionsCommand({
        Bucket: BUCKET_NAME,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker
      });
      const listRes = await s3.send(listCmd);

      const versions = listRes.Versions || [];
      const deleteMarkers = listRes.DeleteMarkers || [];
      const allObjects = [...versions, ...deleteMarkers];

      console.log(`[B2] List Batch: Found ${versions.length} versions and ${deleteMarkers.length} delete markers`);

      if (allObjects.length === 0) {
        break;
      }

      const deleteParams = {
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: allObjects.map(item => ({ Key: item.Key, VersionId: item.VersionId }))
        }
      };
      const deleteCmd = new DeleteObjectsCommand(deleteParams);
      await s3.send(deleteCmd);

      totalDeleted += allObjects.length;
      isTruncated = listRes.IsTruncated;
      keyMarker = listRes.NextKeyMarker;
      versionIdMarker = listRes.NextVersionIdMarker;
    }

    console.log(`[B2] Wipe Complete. Permanently deleted ${totalDeleted} object versions.`);
    res.send(`Cloud storage wiped successfully. Permanently deleted ${totalDeleted} objects.`);
  } catch (err) {
    console.error('[B2] Wipe Error:', err);
    res.status(500).send('Failed to wipe cloud storage');
  }
});

app.listen(port, () => {
  console.log(`Storage Server running at http://localhost:${port}`);
  console.log(`Connected to Backblaze B2 Bucket: ${BUCKET_NAME}`);
});
