import { buildSessionCookies, registerUser } from './_lib/auth-store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const result = await registerUser(req.body || {});

        if (result.session) {
            res.setHeader('Set-Cookie', buildSessionCookies(result.session));
        }

        return res.status(200).json({
            user: result.user,
            pendingConfirmation: result.pendingConfirmation,
            message: result.pendingConfirmation
                ? '이메일 인증 후 로그인해주세요.'
                : '회원가입이 완료되었습니다.',
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || '회원가입에 실패했습니다.' });
    }
}
