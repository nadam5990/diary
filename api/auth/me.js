import { buildExpiredSessionCookies, getAuthenticatedUser } from '../_lib/auth-store.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const auth = await getAuthenticatedUser(req);
    if (auth.setCookies) {
        res.setHeader('Set-Cookie', auth.setCookies);
    }

    if (!auth.user) {
        if (auth.clearCookies) {
            res.setHeader('Set-Cookie', buildExpiredSessionCookies());
        }

        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    return res.status(200).json({ user: auth.user });
}
