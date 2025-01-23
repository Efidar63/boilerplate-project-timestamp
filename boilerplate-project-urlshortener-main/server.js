'use strict';
require('dotenv').config({ path: '.env' });
const express = require('express');
const mongoose = require('mongoose');
const dns = require('dns');
const url = require('url');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: { type: Number, unique: true }
});

const Url = mongoose.model('Url', urlSchema);

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', (req, res) => {
  const inputUrl = req.body.url;

   // More comprehensive URL validation
   const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

  if (!urlPattern.test(inputUrl)) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(parsedUrl.hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    Url.findOne({ original: inputUrl })
      .then(existingUrl => {
        if (existingUrl) {
          return existingUrl;
        }

        return Url.findOne({}).sort({ short: -1 })
          .then(lastUrl => {
            const shortUrl = lastUrl ? lastUrl.short + 1 : 1;

            return Url.create({
              original: inputUrl,
              short: shortUrl
            });
          });
      })
      .then(savedUrl => {
        res.json({
          original_url: savedUrl.original,
          short_url: savedUrl.short
        });
      })
      .catch(error => {
        res.status(500).json({ error: 'Server error' });
      });
  });
});

app.get('/api/shorturl/:short', (req, res) => {
  const shortUrl = parseInt(req.params.short);

  Url.findOne({ short: shortUrl })
    .then(foundUrl => {
      if (!foundUrl) {
        return res.status(404).json({ error: 'URL not found' });
      }
      res.redirect(foundUrl.original);
    })
    .catch(error => {
      res.status(500).json({ error: 'Server error' });
    });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
