import { createSupabaseServiceClient } from './supabase-clients.js';

export async function saveDiaryEntry(user, entry) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .from('diary_entries')
        .insert({
            user_id: user.id,
            original_text: entry.original_text,
            ai_response: entry.ai_response,
            created_at: entry.created_at,
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return { backend: 'supabase', key: data.id };
}

export async function listDiaryEntries(userId) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .from('diary_entries')
        .select('id, original_text, ai_response, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
}
