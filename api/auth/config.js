export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
        return res.status(500).json({ error: 'Supabase public auth configuration is missing.' });
    }

    return res.status(200).json({
        supabaseUrl,
        supabasePublishableKey,
    });
}
