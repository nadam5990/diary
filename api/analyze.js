import { GoogleGenAI } from '@google/genai';
import Redis from 'ioredis';

// Vercel Serverless Function 환경에서는 연결을 재사용하는 것이 권장됩니다.
let redis = null;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
}

export default async function handler(req, res) {
    // CORS 설정 (Vercel 환경 지원)
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required for analysis.' });
        }

        // Vercel 환경 변수에서 가져온 API 키로 초기화
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메세지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: (요약된 감정)\n\n(응원 메시지)' 와 같이 줄바꿈을 포함해서 보내줘.\n\n사용자 일기 내용: "${text}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const aiResponseText = response.text;

        // Redis 저장 로직 (REDIS_URL 존재 시)
        if (redis) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamps = `${month}${day}${hours}${minutes}${seconds}`;
            
            // 저장 키 예시: diary-2024-0319082530
            const key = `diary-${year}-${timestamps}`;
            
            const payload = {
                original_text: text,
                ai_response: aiResponseText,
                created_at: now.toISOString()
            };
            
            await redis.set(key, JSON.stringify(payload));
            console.log(`Saved successfully to Redis key: ${key}`);
        } else {
            console.warn('REDIS_URL is not defined in environment variables. Skipping Redis save.');
        }

        res.status(200).json({ result: aiResponseText });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Failed to analyze text.' });
    }
}
