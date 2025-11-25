const { spawn } = require('child_process');
const path = require('path');

const servers = [
    {
        name: 'Upload Server',
        cmd: 'node',
        args: ['app.js'],
        cwd: path.resolve(__dirname, '../server')
    },
    {
        name: 'GUI Middleware',
        cmd: 'node',
        args: ['server.js'],
        cwd: __dirname
    },
    {
        name: 'GUI Client',
        cmd: 'npm',
        args: ['run', 'dev'],
        cwd: __dirname
    }
];

servers.forEach(({ name, cmd, args, cwd }) => {
    console.log(`[${name}] Starting...`);
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd });

    proc.on('error', (err) => {
        console.error(`[${name}] Failed to start:`, err);
    });

    proc.on('close', (code) => {
        console.log(`[${name}] Exited with code ${code}`);
    });
});

// Handle termination
process.on('SIGINT', () => {
    console.log('Stopping all servers...');
    process.exit();
});
