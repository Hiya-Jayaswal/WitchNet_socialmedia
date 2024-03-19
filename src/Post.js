
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  description: String,
  fileData: Buffer 
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
