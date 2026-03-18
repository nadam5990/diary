import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const diaries = await kv.get('emotion_diaries') || {};
        res.status(200).json(diaries);
    } catch (error) {
        console.error('Error fetching diaries:', error);
        res.status(500).json({ error: 'Failed to fetch diaries.' });
    }
}
