const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function startStaticServer(port = 3000, rootDir = path.join(__dirname, '../out')) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/') reqPath = '/index.html';

        let filePath = path.join(rootDir, reqPath);

        // Check if directory, try index.html
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        // Try adding .html if not found (e.g. /locations -> /locations.html or /locations/index.html)
        if (!fs.existsSync(filePath)) {
          if (fs.existsSync(filePath + '.html')) {
            filePath = filePath + '.html';
          } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
            filePath = path.join(filePath, 'index.html');
          } else {
            // SPA fallback
            filePath = path.join(rootDir, 'index.html');
          }
        }

        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
          });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error: ' + err.message);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[NexusFile UI] Production static server running on http://127.0.0.1:${port}`);
      resolve(server);
    });

    server.on('error', (err) => {
      // If port 3000 already in use (e.g. during dev), resolve anyway
      console.warn(`[NexusFile UI] Static server notice on port ${port}: ${err.message}`);
      resolve(null);
    });
  });
}

module.exports = { startStaticServer };
