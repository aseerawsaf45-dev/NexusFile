const { app } = require('electron');
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);

try {
  const { DatabaseSync } = require('node:sqlite');
  console.log('node:sqlite is SUPPORTED in this Electron runtime!');
} catch (e) {
  console.log('node:sqlite is NOT in this Electron runtime:', e.message);
}

if (app) {
  setTimeout(() => app.quit(), 500);
}
