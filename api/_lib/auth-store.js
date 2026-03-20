import { createSupabaseAuthClient } from './supabase-clients.js';

const ACCESS_COOKIE = 'day5-access-token';
const REFRESH_COOKIE = 'day5-refresh-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function normalizeName(user) {
    return user.user_metadata?.name || user.email?.split('@')[0] || '사용자';
}

function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: normalizeName(user),
        created_at: user.created_at,
    };
}

function buildCookie(name, value, maxAge) {
    return [
        `${name}=${value}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${maxAge}`,
    ].join('; ');
}

export function buildSessionCookies(session) {
    return [
        buildCookie(ACCESS_COOKIE, session.access_token, COOKIE_MAX_AGE),
        buildCookie(REFRESH_COOKIE, session.refresh_token, COOKIE_MAX_AGE),
    ];
}

export function buildExpiredSessionCookies() {
    return [
        buildCookie(ACCESS_COOKIE, '', 0),
        buildCookie(REFRESH_COOKIE, '', 0),
    ];
}

export async function registerUser({ email, password, name }) {
    const supabase = createSupabaseAuthClient();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();

    if (!normalizedName) {
        throw new Error('닉네임을 입력해 주세요.');
    }

    const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
            data: {
                name: normalizedName,
            },
        },
    });

    if (error) {
        throw new Error(error.message);
    }

    const user = data.user ? toPublicUser(data.user) : null;
    const session = data.session || null;

    return {
        user,
        session,
        pendingConfirmation: !session,
    };
}

function mapLoginErrorMessage(error) {
    const message = String(error?.message || '');

    if (/Email not confirmed/i.test(message)) {
        return '이메일 인증을 완료한 뒤 로그인해 주세요.';
    }

    if (/Invalid login credentials/i.test(message)) {
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }

    return message || '로그인에 실패했습니다.';
}

export async function loginUser({ email, password }) {
    const supabase = createSupabaseAuthClient();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
    });

    if (error) {
        throw new Error(mapLoginErrorMessage(error));
    }

    return {
        user: toPublicUser(data.user),
        session: data.session,
    };
}

export async function createSessionFromTokens({ access_token, refresh_token }) {
    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
    });

    const user = data.user || data.session?.user;
    if (error || !data.session || !user) {
        throw new Error('구글 로그인 세션을 확인하지 못했습니다.');
    }

    return {
        user: toPublicUser(user),
        session: data.session,
    };
}

export async function getAuthenticatedUser(req) {
    const accessToken = req.cookies?.[ACCESS_COOKIE];
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    const supabase = createSupabaseAuthClient();

    if (!accessToken) {
        return { user: null, setCookies: null, clearCookies: false };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (!userError && userData.user) {
        return { user: toPublicUser(userData.user), setCookies: null, clearCookies: false };
    }

    if (!refreshToken) {
        return { user: null, setCookies: null, clearCookies: true };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    const refreshedUser = sessionData.user || sessionData.session?.user;
    if (sessionError || !sessionData.session || !refreshedUser) {
        return { user: null, setCookies: null, clearCookies: true };
    }

    return {
        user: toPublicUser(refreshedUser),
        setCookies: buildSessionCookies(sessionData.session),
        clearCookies: false,
    };
}
