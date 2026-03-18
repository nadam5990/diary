import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { diaries } = req.body;
        
        if (!diaries) {
            return res.status(400).json({ error: 'Diaries payload is required.' });
        }

        await kv.set('emotion_diaries', diaries);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving diaries:', error);
        res.status(500).json({ error: 'Failed to save diaries.' });
    }
}
