const fs = require('fs');
const http = require('http');
const url = require('url');
const { google } = require('googleapis');
const { exec } = require('child_process');
const destroyer = require('server-destroy');

// SCOPES required for Business Profile API
const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

// Helper to open browser cross-platform
const openBrowser = (url) => {
    const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
    exec(`${start} "${url}"`);
};

async function main() {
    let keys;
    try {
        const content = fs.readFileSync('client_secret.json');
        keys = JSON.parse(content);
    } catch (e) {
        console.error('Error: client_secret.json not found in the root directory.');
        return;
    }

    const key = keys.installed || keys.web;

    if (!key) {
        console.error('Error: Invalid client_secret.json format.');
        return;
    }

    const oauth2Client = new google.auth.OAuth2(
        key.client_id,
        key.client_secret,
        key.redirect_uris[0]
    );

    google.options({ auth: oauth2Client });

    // Create a temporary server to handle the callback
    const server = http.createServer(async (req, res) => {
        try {
            if (req.url.indexOf('/oauth2callback') > -1) {
                const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
                res.end('Authentication successful! You can check the terminal for your tokens.');
                server.destroy();
                const { tokens } = await oauth2Client.getToken(qs.get('code'));
                console.log('\n=========================================');
                console.log('SUCCESS! Here are your credentials:');
                console.log('=========================================\n');
                console.log('REFRESH_TOKEN:', tokens.refresh_token);
                console.log('ACCESS_TOKEN:', tokens.access_token);
                console.log('\n=========================================');
                console.log('Please copy these tokens safely.');
                console.log('=========================================\n');
                process.exit(0);
            }
        } catch (e) {
            console.error(e);
        }
    }).listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Opening browser for authentication...');
        console.log('If it does not open automatically, visit this URL:');
        console.log(authorizeUrl);
        openBrowser(authorizeUrl);
    });
    destroyer(server);
}

main().catch(console.error);
