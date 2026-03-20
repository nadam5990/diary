import { createSupabaseAuthClient, createSupabaseServiceClient } from './supabase-clients.js';

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
    const adminClient = createSupabaseServiceClient();
    const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            name: String(name || '').trim(),
        },
    });

    if (error) {
        throw new Error(error.message);
    }

    const loginResult = await loginUser({ email, password });

    return {
        user: data.user ? toPublicUser(data.user) : loginResult.user,
        session: loginResult.session,
        pendingConfirmation: false,
    };
}

export async function loginUser({ email, password }) {
    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw new Error(error.message);
    }

    return {
        user: toPublicUser(data.user),
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
