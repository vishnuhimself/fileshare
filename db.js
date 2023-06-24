const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/fileshare', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to the database'))
  .catch((err) => console.log('Failed to connect to the database', err));

module.exports = mongoose;
