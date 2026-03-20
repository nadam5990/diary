import OpenAI from 'openai';
import { buildExpiredSessionCookies, getAuthenticatedUser } from './_lib/auth-store.js';
import { saveDiaryEntry } from './_lib/diary-store.js';

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

    if (req.method !== 'POST') {
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

        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required for analysis.' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
        }

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const instructions = [
            'You are a warm and empathetic journaling assistant.',
            'Read the user diary entry and identify the single dominant emotion.',
            'Choose one Korean emotion label from: 기쁨, 슬픔, 분노, 불안, 평온.',
            'Then write 2-3 supportive sentences in Korean.',
            'Output exactly in this format with one blank line between sections:',
            '감정: <emotion>',
            '<supportive message>',
        ].join('\n');

        const response = await client.responses.create({
            model: 'gpt-5-mini',
            reasoning: { effort: 'low' },
            instructions,
            input: text,
        });

        const aiResponseText = response.output_text?.trim();
        if (!aiResponseText) {
            throw new Error('OpenAI response was empty.');
        }

        const payload = {
            original_text: text,
            ai_response: aiResponseText,
            created_at: new Date().toISOString(),
        };

        const saveResult = await saveDiaryEntry(auth.user, payload);

        if (saveResult.backend === 'none') {
            console.warn('No diary storage is configured. Skipping save.');
        } else {
            console.log(`Saved successfully to ${saveResult.backend} key: ${saveResult.key}`);
        }

        res.status(200).json({ result: aiResponseText });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze text.' });
    }
}
