const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const src = path.join(rootDir, 'dist', 'NexusFile-Portable.exe');

if (fs.existsSync(src)) {
  const targets = [
    path.join(rootDir, 'NexusFile-Portable.exe'),
    path.join(rootDir, 'Sortwise-Portable.exe'),
    path.join(rootDir, 'dist', 'Sortwise-Portable.exe')
  ];

  for (const target of targets) {
    try {
      fs.copyFileSync(src, target);
      console.log(`[Sync] Updated: ${path.basename(target)}`);
    } catch (err) {
      console.warn(`[Sync] Notice copying to ${path.basename(target)}:`, err.message);
    }
  }
}
