const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalname: {
    type: String,
    required: true
  },
  urlFriendlyOriginalname: {
    type: String,
    required: true
  },
  uniqueString: {
    type: String,
    required: true
},
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  downloadCount: {  // New field for download count
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const File = mongoose.model('File', fileSchema);

module.exports = File;
