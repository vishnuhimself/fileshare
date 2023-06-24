const express = require('express');
const router = new express.Router();
const User = require('./User'); 
const File = require('./File');
const auth = require('./auth');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '/uploads');

function admin(req, res, next) {
    if (!req.user.isAdmin)
      return res.status(403).send('Access denied.');
  
    next();
  }
  
  module.exports = admin;
  
  router.get('/users', auth, admin, async (req, res) => {
    const users = await User.find({});
    res.send(users);
  });
  
  router.get('/files', auth, admin, async (req, res) => {
    const files = await File.find({});
    res.send(files);
  });
  
  router.delete('/user/:id', auth, admin, async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
    
      if (!user) {
        return res.status(404).send();
      }
  
      res.send(user);
    } catch (e) {
      console.log(e); // Let's log the error to the console.
      res.status(500).send();
    }
  });

  router.get('/user/:id/files', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
  
        if (!user) {
            return res.status(404).send()
        }

        const files = await File.find({ uploader: req.params.id });
        res.send(files);
    } catch (e) {
        res.status(500).send()
    }
});

router.get('/admin/user/:id/files', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
  
        if (!user) {
            return res.status(404).send()
        }

        const files = await File.find({ uploader: req.params.id });
        res.send(files);
    } catch (e) {
        res.status(500).send()
    }
});

router.delete('/file/:id', auth, admin, async (req, res) => {
    const file = await File.findById(req.params.id)
  
    if (!file) {
      return res.status(404).send({ error: 'File not found.' });
    }
  
    try {
      const filePath = path.join(uploadDir, file.filename);
  
      fs.unlink(filePath, async (err) => {
        if (err) {
          console.log(err);
          return res.status(400).send({ error: 'Failed to delete file.' });
        }
  
        // Find the user who uploaded the file and reduce their diskUsage
        const uploader = await User.findById(file.uploader);
        uploader.diskUsage -= file.size;
        uploader.fileCount -= 1;
        await uploader.save();
  
        // Delete file document from MongoDB
        await File.deleteOne({ _id: req.params.id });
  
        res.send({ success: 'File deleted.' });
      });
    } catch (e) {
      console.log(e);
      res.status(500).send({ error: 'Server error.' });
    }
  });
  

  module.exports = router;