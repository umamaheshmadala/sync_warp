const fs = require('fs');
const { google } = require('googleapis');

// Configuration
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN_HERE';
const REGION_CODE = 'IN';
const LANGUAGE_CODE = 'en';

async function main() {
    // 1. Load Client Credentials
    let keys;
    try {
        const content = fs.readFileSync('client_secret.json');
        keys = JSON.parse(content);
    } catch (e) {
        console.error('Error reading client_secret.json:', e);
        return;
    }

    const key = keys.installed || keys.web;

    const oauth2Client = new google.auth.OAuth2(
        key.client_id,
        key.client_secret,
        key.redirect_uris[0]
    );

    oauth2Client.setCredentials({
        refresh_token: REFRESH_TOKEN
    });

    // 2. Initialize API
    const mybusiness = google.mybusinessbusinessinformation({
        version: 'v1',
        auth: oauth2Client
    });

    console.log(`Starting fetch for Region: ${REGION_CODE}, Language: ${LANGUAGE_CODE}...`);

    let allCategories = [];
    let nextPageToken = null;
    let pageCount = 0;

    // 3. Fetch Loop
    do {
        pageCount++;
        console.log(`Fetching page ${pageCount}...`);

        let success = false;
        let retries = 0;
        const maxRetries = 5;

        while (!success && retries < maxRetries) {
            try {
                // Add delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 2000 + (retries * 2000)));

                const res = await mybusiness.categories.list({
                    regionCode: REGION_CODE,
                    languageCode: LANGUAGE_CODE,
                    pageSize: 100, // Max page size
                    pageToken: nextPageToken,
                    view: 'FULL' // Get all details including service types if available
                });

                const categories = res.data.categories || [];
                allCategories = allCategories.concat(categories);
                nextPageToken = res.data.nextPageToken;

                success = true;
                console.log(`  Received ${categories.length} categories. Total so far: ${allCategories.length}`);
            } catch (error) {
                console.error(`Attempt ${retries + 1} failed:`, error.message);

                // Retry on rate limit errors
                if (error.code === 429 || error.status === 'RESOURCE_EXHAUSTED' || (error.response && error.response.status === 429)) {
                    retries++;
                    const waitTime = 10000 * retries; // Exponential backoff
                    console.log(`Rate limit hit. Waiting ${waitTime / 1000} seconds before retrying...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    console.error('Non-retriable error:', error);
                    break; // Exit retry loop
                }
            }
        }

        if (!success) {
            console.error('Failed to fetch page after max retries. Stopping.');
            break; // Exit main loop but save what we have
        }

    } while (nextPageToken);

    // 4. Save Raw Data
    console.log(`\nFinished! Total categories fetched: ${allCategories.length}`);
    fs.writeFileSync('official_gmb_categories_india.json', JSON.stringify(allCategories, null, 2));
    console.log('Saved to official_gmb_categories_india.json');
}

main().catch(console.error);
