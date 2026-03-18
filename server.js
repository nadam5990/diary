import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Initialize the Gemini API client explicitly with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/analyze', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required for analysis.' });
        }

        // Call the Gemini API model with the requested prompt
        const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메세지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: (요약된 감정)\n\n(응원 메시지)' 와 같이 줄바꿈을 포함해서 보내줘.\n\n사용자 일기 내용: "${text}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.json({ result: response.text });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Failed to analyze text.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log('Ensure you have your .env file created with GEMINI_API_KEY=your_key_here');
});
