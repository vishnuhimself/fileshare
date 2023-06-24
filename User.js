const mongoose = require('./db');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  diskUsage: { type: Number, default: 0 },
  fileCount: { type: Number, default: 0, },
  fileLimit: { type: Number, default: 2, },
  diskLimit: { type: Number, default: 2 * 1024 * 1024 * 1024, }, // 2 GB in bytes
  fileSizeLimit: { type: Number, default: 100 * 1024 * 1024, }, // 100 MB in bytes 
  allowedFileExtensions: { type: [String], default: ['jpg', 'png', 'pdf', 'txt', 'zip'] }, // The default file extensions
  tokens: [{ token: { type: String, required: true }, }]
});

UserSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
