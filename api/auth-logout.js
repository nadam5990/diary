import { buildExpiredSessionCookies } from './_lib/auth-store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    res.setHeader('Set-Cookie', buildExpiredSessionCookies());
    return res.status(200).json({ success: true });
}
