const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Post = require('./models/Post');


const app = express();
async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.post('/add-post', upload.single('image'), async (req, res) => {
  try {
    const { title, comment } = req.body;
    const imageUrl = req.file.path; 
    const post = new Post({
      title,
      comment,
      imageUrl
    });

    await post.save();
    res.status(201).send('Post added successfully');
  } catch (error) {
    console.error('Error adding post:', error);
    res.status(500).send('Error adding post');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = connectToDatabase;
