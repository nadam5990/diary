import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import analyzeHandler from './api/analyze.js';
import authConfigHandler from './api/auth-config.js';
import loginHandler from './api/auth-login.js';
import logoutHandler from './api/auth-logout.js';
import meHandler from './api/auth-me.js';
import registerHandler from './api/auth-register.js';
import authSessionHandler from './api/auth-session.js';
import historyHandler from './api/history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
};

function createResponseAdapter(nodeRes) {
    return {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
            if (name.toLowerCase() === 'set-cookie') {
                const current = this.headers[name];
                if (Array.isArray(current)) {
                    this.headers[name] = [...current, value];
                } else if (current) {
                    this.headers[name] = [current, value];
                } else {
                    this.headers[name] = value;
                }
                return;
            }

            this.headers[name] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            if (!nodeRes.headersSent) {
                nodeRes.writeHead(this.statusCode, {
                    'Content-Type': 'application/json; charset=utf-8',
                    ...this.headers,
                });
            }
            nodeRes.end(JSON.stringify(payload));
            return this;
        },
        end(body = '') {
            if (!nodeRes.headersSent) {
                nodeRes.writeHead(this.statusCode, this.headers);
            }
            nodeRes.end(body);
            return this;
        },
    };
}

async function parseRequestBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    if (chunks.length === 0) {
        return {};
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
}

function parseCookies(cookieHeader = '') {
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex === -1) {
                return cookies;
            }

            const key = part.slice(0, separatorIndex);
            const value = decodeURIComponent(part.slice(separatorIndex + 1));
            cookies[key] = value;
            return cookies;
        }, {});
}

async function serveStaticFile(nodeRes, filePath) {
    try {
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        nodeRes.writeHead(200, {
            'Content-Type': contentTypes[ext] || 'application/octet-stream',
        });
        nodeRes.end(data);
    } catch {
        nodeRes.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        nodeRes.end('Not Found');
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const cookies = parseCookies(req.headers.cookie);

    try {
        if (url.pathname === '/api/auth/register') {
            const body = await parseRequestBody(req);
            await registerHandler(
                { method: req.method, body, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        if (url.pathname === '/api/auth/login') {
            const body = await parseRequestBody(req);
            await loginHandler(
                { method: req.method, body, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        if (url.pathname === '/api/auth/config') {
            await authConfigHandler(
                { method: req.method, body: {}, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        if (url.pathname === '/api/auth/session') {
            const body = await parseRequestBody(req);
            await authSessionHandler(
                { method: req.method, body, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        if (url.pathname === '/api/auth/logout') {
            await logoutHandler(
                { method: req.method, body: {}, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        if (url.pathname === '/api/auth/me') {
            await meHandler(
                { method: req.method, body: {}, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        if (url.pathname === '/api/analyze') {
            const body = await parseRequestBody(req);
            await analyzeHandler(
                { method: req.method, body, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        if (url.pathname === '/api/history') {
            await historyHandler(
                { method: req.method, body: {}, cookies, headers: req.headers },
                createResponseAdapter(res)
            );
            return;
        }

        const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
        const filePath = path.join(__dirname, requestedPath);
        await serveStaticFile(res, filePath);
    } catch (error) {
        console.error('Local server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
});

server.listen(PORT, () => {
    console.log(`Local server running at http://localhost:${PORT}`);
});
