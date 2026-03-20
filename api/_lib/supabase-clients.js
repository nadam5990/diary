import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
    const value = process.env.SUPABASE_URL;
    if (!value) {
        throw new Error('SUPABASE_URL is not configured.');
    }

    return value;
}

function getSupabasePublishableKey() {
    const value = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!value) {
        throw new Error('SUPABASE_PUBLISHABLE_KEY is not configured.');
    }

    return value;
}

function getSupabaseServiceRoleKey() {
    const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!value) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
    }

    return value;
}

const serverAuthOptions = {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
};

export function createSupabaseAuthClient() {
    return createClient(getSupabaseUrl(), getSupabasePublishableKey(), serverAuthOptions);
}

export function createSupabaseServiceClient() {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), serverAuthOptions);
}
