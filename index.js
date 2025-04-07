require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Set stored refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

// Google YouTube instance
const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client,
});

// === Step 1: Auth Redirect ===
app.get('/auth', (req, res) => {
  const scopes = ['https://www.googleapis.com/auth/youtube.upload'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  res.redirect(url);
});

// === Step 2: Callback to Exchange Code ===
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Save refresh token to file (only if you don't use env vars for it)
    fs.writeFileSync('tokens.json', JSON.stringify(tokens));
    res.send('✅ Authorization successful! You can now upload videos.');
  } catch (err) {
    console.error('OAuth Error:', err);
    res.status(500).send('Failed to retrieve access token.');
  }
});

// === Step 3: Upload Video ===
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const filePath = req.file.path;

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: req.body.title || 'Untitled Video',
          description: req.body.description || '',
          tags: ['youtube', 'api', 'upload'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'unlisted',
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    });

    // Clean up uploaded file
    fs.unlink(filePath, () => {
      console.log(`🗑️ Removed temp file: ${filePath}`);
    });

    res.json({
      success: true,
      videoId: response.data.id,
      url: `https://www.youtube.com/watch?v=${response.data.id}`,
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// === Server Startup ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
