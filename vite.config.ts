import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

function contactApiDevPlugin(): Plugin {
  return {
    name: 'contact-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/contact', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, status: 'ready', env: 'development' }));
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        let bodyRaw = '';
        req.on('data', (chunk) => {
          bodyRaw += chunk;
        });

        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const data = JSON.parse(bodyRaw);

            // Spam check: honeypot
            if (data.website || data.bot_check) {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Message received.' }));
              return;
            }

            // Validation
            const name = typeof data.name === 'string' ? data.name.trim() : '';
            const email = typeof data.email === 'string' ? data.email.trim() : '';
            const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
            const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
            const message = typeof data.message === 'string' ? data.message.trim() : '';

            if (!name || name.length < 2) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Please enter your name (at least 2 characters).' }));
              return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
              return;
            }

            if (!reason) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Please select a reason for your enquiry.' }));
              return;
            }

            if (!message || message.length < 10) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Message must be at least 10 characters long.' }));
              return;
            }

            const submissionId = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
            const submission = {
              id: submissionId,
              name,
              email,
              phone: phone || null,
              reason,
              message,
              submittedAt: new Date().toISOString()
            };

            // Save submission securely in server-side .data/ directory
            const dataDir = path.resolve('.data');
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            const submissionsFile = path.join(dataDir, 'submissions.json');
            let currentList: any[] = [];
            if (fs.existsSync(submissionsFile)) {
              try {
                currentList = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8'));
              } catch {
                currentList = [];
              }
            }
            currentList.push(submission);
            fs.writeFileSync(submissionsFile, JSON.stringify(currentList, null, 2), 'utf-8');

            // Simulate email notification dispatch server-side
            console.log('\n======================================================');
            console.log('[SERVER-SIDE EMAIL NOTIFICATION DISPATCHED]');
            console.log(`To: jawedimtiaz@gmail.com`);
            console.log(`From: no-reply@jawed.co.in`);
            console.log(`Subject: [Jawed.co.in Contact] ${reason} from ${name}`);
            console.log(`Details: Email: ${email} | Phone: ${phone || 'N/A'}`);
            console.log(`Message:\n${message}`);
            console.log('======================================================\n');

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                id: submissionId,
                message: `Thank you, ${name}! Your enquiry has been received securely. An email notification has been dispatched, and I will be in touch soon.`
              })
            );
          } catch (err: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON request payload.' }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    contactApiDevPlugin()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        }
      }
    }
  }
});
