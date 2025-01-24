'use strict';
require('dotenv').config({ path: '.env' });
const express = require('express');
const mongoose = require('mongoose');
const dns = require('dns');
const url = require('url');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(process.cwd() + '/public'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: { type: Number, unique: true }
});

const Url = mongoose.model('Url', urlSchema);

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', (req, res) => {
  const inputUrl = req.body.url;

  try {
    const parsedUrl = new URL(inputUrl.startsWith('http') ? inputUrl : `http://${inputUrl}`);
    dns.lookup(parsedUrl.hostname, (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }

      Url.findOne({ original: parsedUrl.href })
        .then(existingUrl => existingUrl || Url.findOne().sort({ short: -1 }).then(lastUrl => Url.create({ original: parsedUrl.href, short: lastUrl ? lastUrl.short + 1 : 1 })))
        .then(savedUrl => res.json({ original_url: savedUrl.original, short_url: savedUrl.short }))
        .catch(error => res.status(500).json({ error: 'Server error' }));
    });
  } catch (error) {
    res.json({ error: 'invalid url' });
  }
});

app.get('/api/shorturl/:short', (req, res) => {
  const shortUrl = parseInt(req.params.short);
  Url.findOne({ short: shortUrl })
    .then(foundUrl => foundUrl ? res.redirect(foundUrl.original) : res.status(404).json({ error: 'URL not found' }))
    .catch(error => res.status(500).json({ error: 'Server error' }));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
