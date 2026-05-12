import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    try {
        // Parse the incoming Web Vitals payload
        const data = JSON.parse(event.body || '{}');

        // Log it so it appears in the Netlify function logs
        console.log('[Web Vitals]', JSON.stringify(data));

        // Acknowledge receipt immediately
        // In the future: Insert this data into Supabase `web_vitals` table here
        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'OK' }),
            headers: {
                'Content-Type': 'application/json',
            },
        };
    } catch (error) {
        console.error('Failed to parse Web Vitals payload:', error);
        return {
            statusCode: 400,
            body: 'Bad Request',
        };
    }
};
