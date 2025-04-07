require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'https://youtube-server-1kb0.onrender.com' // or your original redirect URI
);

// Set refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

// YouTube API instance
const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client,
});

async function uploadVideo() {
  try {
    const res = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: req.body.title,
          description: req.body.description,
          tags: ['auto', 'youtube', 'api'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'unlisted', // or public/private
        },
      },
      media: {
        body: fs.createReadStream('video.mp4'), // Replace with your video file name
      },
    });

    console.log('✅ Video uploaded successfully!');
    console.log('📺 Video URL: https://www.youtube.com/watch?v=' + res.data.id);
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
}

uploadVideo();
