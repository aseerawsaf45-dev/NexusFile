const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const src = path.join(rootDir, 'dist', 'NexusFile-Portable.exe');

if (fs.existsSync(src)) {
  const target = path.join(rootDir, 'NexusFile-Portable.exe');
  try {
    fs.copyFileSync(src, target);
    console.log(`[Sync] Updated: ${path.basename(target)}`);
  } catch (err) {
    console.warn(`[Sync] Notice copying to ${path.basename(target)}:`, err.message);
  }

  // Remove legacy/backdated portable binaries
  const legacyFiles = [
    path.join(rootDir, 'Sortwise-Portable.exe'),
    path.join(rootDir, 'dist', 'Sortwise-Portable.exe')
  ];
  for (const legacy of legacyFiles) {
    if (fs.existsSync(legacy)) {
      try {
        fs.unlinkSync(legacy);
        console.log(`[Clean] Removed legacy binary: ${path.basename(legacy)}`);
      } catch {}
    }
  }
}

