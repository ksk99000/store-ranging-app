const fs = require('fs');
const { google } = require('googleapis');

// This script will be run by Netlify and will fetch data directly from the Google Sheets API.
async function fetchData() {
    console.log('Fetching data directly from Google Sheets API...');
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // Fetch all three sheets in parallel for speed
        const [rangingResponse, dealsResponse, locationsResponse] = await Promise.all([
            sheets.spreadsheets.values.get({ spreadsheetId, range: 'Ranging' }),
            sheets.spreadsheets.values.get({ spreadsheetId, range: 'Deals' }),
            sheets.spreadsheets.values.get({ spreadsheetId, range: 'StoreLocations' })
        ]);
        
        // Process Deals data
        const dealsDataRaw = dealsResponse.data.values || [];
        const dealsHeadersRaw = dealsDataRaw.shift();
        const dealsHeaders = dealsHeadersRaw.map(h => h.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        const dealsData = dealsDataRaw.map(row => {
            const dealObject = {};
            dealsHeaders.forEach((header, i) => {
                dealObject[header] = row[i];
            });
            return dealObject;
        });

        // Process Locations data
        const locationsDataRaw = locationsResponse.data.values || [];
        locationsDataRaw.shift(); // remove headers
        const storeLocations = locationsDataRaw.map(row => ({
            store: row[0],
            latitude: row[1],
            longitude: row[2]
        }));
        
        const output = {
            rangingData: rangingResponse.data.values || [],
            dealsData: dealsData,
            storeLocations: storeLocations
        };

        const outputDir = 'dist';
        if (!fs.existsSync(outputDir)){
            fs.mkdirSync(outputDir);
        }
        fs.writeFileSync(`${outputDir}/data.json`, JSON.stringify(output, null, 2));
        console.log(`Data successfully fetched and saved to ${outputDir}/data.json`);

    } catch (error) {
        console.error('Error fetching data from Google Sheets API:', error);
        process.exit(1);
    }
}

fetchData();

