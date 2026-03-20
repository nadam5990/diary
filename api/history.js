import { buildExpiredSessionCookies, getAuthenticatedUser } from './_lib/auth-store.js';
import { listDiaryEntries } from './_lib/diary-store.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
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

        const history = await listDiaryEntries(auth.user.id);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch diary history.' });
    }
}
