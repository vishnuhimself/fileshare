const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
  }
});

const upload = multer();

/* const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1000000, // limit to 1MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
      return cb(new Error('Please upload a JPG, JPEG, PNG or PDF file.'));
    }
    cb(undefined, true);
  },
}); */

module.exports = upload;
