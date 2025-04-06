// index.js (Node.js with Express)
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

// OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'https://yourserver.com/oauth2callback'
);

// Step 1: Send user to Google for auth
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
  });
  res.redirect(authUrl);
});

// Step 2: OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  // You can store tokens in a DB or session
  res.send('Auth successful. You can now upload!');
});

// Step 3: Upload video
app.post('/upload', upload.single('video'), async (req, res) => {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const filePath = req.file.path;

  try {
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: req.body.title || 'Uploaded from Flutter',
          description: req.body.description || '',
        },
        status: {
          privacyStatus: 'private',
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    });

    res.send({ videoId: response.data.id });
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    fs.unlinkSync(filePath); // Delete temp file
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running');
});
