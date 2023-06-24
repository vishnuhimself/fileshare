const express = require('express');
const auth = require('./auth');
const path = require('path');
const upload = require('./upload');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./User'); 
const File = require('./File');
const admin = require('./admin');
const crypto = require('crypto');
const { constants } = require('http2');
const app = express();
const port = 3000;
const adminRouter = require('./admin');

app.use('/admin', adminRouter);
app.use('/public', express.static('uploads'));//Tell Express to serve the uploads folder statically:
app.use(express.json()); // add this line after initializing the app variable

// replace your current app.get('/') with this
app.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

app.post('/login', async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(400).send({ error: 'Invalid login credentials' });
      }
      
      const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isPasswordMatch) {
        return res.status(400).send({ error: 'Invalid login credentials' });
      }
  
      const token = jwt.sign({ _id: user._id.toString() }, 'thisismysecretkey');
  
      user.tokens = user.tokens.concat({ token });
      await user.save();
  
      res.send({ message: 'User logged in successfully', token });
    } catch (error) {
      res.status(500).send({ error: error.toString() });
    }
  });
  
  app.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

app.post('/upload', auth, upload.array('file', 12), async (req, res) => {
  try {

    // Before processing the files, check the limits
    if (req.files.length + req.user.fileCount > req.user.fileLimit) {
      return res.status(400).send({ error: 'File limit exceeded.' });
    }

    const totalSize = req.files.reduce((total, file) => total + file.size, 0);
    if (totalSize + req.user.diskUsage > req.user.diskLimit) {
      return res.status(400).send({ error: 'Disk usage limit exceeded.' });
    }

    for (let file of req.files) {
      if (file.size > req.user.fileSizeLimit) {
        return res.status(400).send({ error: 'File size limit exceeded.' });
      }
    }

    const mimeTypeMapping = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tif': 'image/tiff',
      'tiff': 'image/tiff',
      'ico': 'image/x-icon',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'css': 'text/css',
      'csv': 'text/csv',
      'html': 'text/html',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'rar': 'application/vnd.rar',
      'tar': 'application/x-tar',
      '7z': 'application/x-7z-compressed',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'mp4': 'video/mp4',
      'mkv': 'video/x-matroska',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'flv': 'video/x-flv',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'odt': 'application/vnd.oasis.opendocument.text',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet'
      // Add more mappings as needed
    };

    const allowedMimeTypes = req.user.allowedFileExtensions.map(ext => mimeTypeMapping[ext]);

    //Process uploaded files
    const files = [];

    for (let file of req.files) {
      // Check if the file's MIME type is allowed
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).send({ error: 'This type of file is not allowed.' });
      }

      const urlFriendlyOriginalname = file.originalname.replace(/ /g, "-");
      const uniqueString = crypto.randomBytes(5).toString('hex');

      files.push(new File({
        filename: file.filename,
        originalname: file.originalname,
        urlFriendlyOriginalname: urlFriendlyOriginalname,
        mimetype: file.mimetype,
        size: file.size,
        uploader: req.user._id,
        uniqueString: uniqueString
      }));
    }

    let totalFileSize = 0;

    for (let file of files) {
      await file.save();
      totalFileSize += file.size;  // accumulate the size of each file
    }

    // Update user's disk usage and file count after all files have been saved
    req.user.diskUsage += totalFileSize;
    req.user.fileCount += files.length;
    await req.user.save();

    res.status(201).send({ message: 'Files uploaded successfully', files });
  } catch (error) {
    res.status(400).send(error);
  }
});


app.get('/download/:uniqueString', async (req, res) => {
  console.log('Download route hit');  // add this line
  
  try {
    let uniqueString = req.params.uniqueString;
    console.log('Trying to find file:', req.params.filename);
    let file = await File.findOne({ uniqueString: uniqueString });

    console.log('File found:', file);
    
    if (!file) {
      return res.status(404).send();
    }

    const fileDirectoryPath = path.join(__dirname, '/uploads/');
    const filePath = fileDirectoryPath + file.filename;

    console.log('Full file path:', filePath);  // log the file path

    // Increment the download count
    file.downloadCount++;
    await file.save();

    res.download(filePath, file.originalname); // Set the original file name
  } catch (error) {
    console.error('Caught an error:', error);
    res.status(500).send({ error: 'Download failed' });
  }
});

app.get('/file/:uniqueString', async (req, res) => {
  try {
    let uniqueString = req.params.uniqueString;
    let file = await File.findOne({ uniqueString: uniqueString });
    
    if (!file) {
      return res.status(404).send();
    }

    res.send(file);
  } catch (error) {
    console.error('Caught an error:', error);
    res.status(500).send({ error: 'Fetch failed' });
  }
});

app.get('/user/:userId/files', auth, async (req, res) => {
  try {
    // Make sure the requesting user is the same as the user whose files are being requested
    if (req.params.userId !== req.user._id.toString()) {
      return res.status(403).send({ error: 'You can only view your own files' });
    }
    const files = await File.find({ uploader: req.params.userId });
    res.send(files);
  } catch (error) {
    console.error('Caught an error:', error);
    res.status(500).send({ error: 'Fetch failed' });
  }
});

app.delete('/file/:fileId', auth, async (req, res) => {
  try {
    // Only the uploader of a file should be able to delete it
    const file = await File.findOne({ _id: req.params.fileId, uploader: req.user._id });

    if (!file) {
      return res.status(404).send();
    }
    req.user.diskUsage -= file.size;
    req.user.fileCount -= 1;
    await req.user.save();

    // Delete the file from the database
    await File.deleteOne({ _id: req.params.fileId });
    res.send({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Caught an error:', error);
    res.status(500).send({ error: 'Delete failed' });
  }
});

app.get('/admin/some-route', auth, admin, (req, res) => {
  // This will only run if the user is authenticated and is an admin.
});

app.get('/admin/all-users', auth, admin, async (req, res) => {
  const users = await User.find({});
  res.send(users);
});
// To delete users
app.delete('/admin/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).send('User not found');
    }

    await user.deleteOne();
    res.send({ message: 'User deleted' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete user' });
  }
});
//To delete files
app.delete('/admin/files/:id', auth, admin, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).send('File not found');
    }

    await file.deleteOne();
    res.send({ message: 'File deleted' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete file' });
  }
});
//Router to create admin user
app.post('/admin/create', async (req, res) => {
  try {
    const user = new User(req.body);
    user.isAdmin = true;  // Make this user an admin
    await user.save();
    res.send({ message: 'Admin user created successfully', user });
  } catch (error) {
    res.status(500).send({ error: 'Failed to create admin user' });
  }
});
//List all users
app.get('/admin/users', auth, admin, async (req, res) => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});