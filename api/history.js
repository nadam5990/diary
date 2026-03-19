import Redis from 'ioredis';

let redis = null;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
}

export default async function handler(req, res) {
    // CORS 설정
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
        if (!redis) {
            return res.status(500).json({ error: 'REDIS_URL is not configured' });
        }

        // 'diary-*' 패턴과 일치하는 모든 키 가져오기
        const keys = await redis.keys('diary-*');
        if (keys.length === 0) {
            return res.status(200).json([]);
        }

        // 키를 사용해 모든 데이터를 일괄 가져오기
        const values = await redis.mget(keys);

        // JSON 파싱 후, created_at 기준으로 최신순 정렬
        const history = values
            .filter(val => val !== null)
            .map(val => JSON.parse(val))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch diary history.' });
    }
}
