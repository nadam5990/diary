import { buildSessionCookies, createSessionFromTokens } from '../_lib/auth-store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const result = await createSessionFromTokens(req.body || {});
        res.setHeader('Set-Cookie', buildSessionCookies(result.session));
        return res.status(200).json({ user: result.user });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'OAuth 세션 설정에 실패했습니다.' });
    }
}
