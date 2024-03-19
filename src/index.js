const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const Post = require('./Post');


mongoose.connect("mongodb://localhost:27017/", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch((error) => {
        console.error('MongoDB connection failed:', error);
    });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    imageUrl: { type: String }
});


const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    imageUrl: { type: String }
}, { timestamps: true });


const Message = mongoose.model('Message', messageSchema, 'messages');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(upload.single('image')); 


const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));


const templatePath = path.join(__dirname, '../templates');
app.set('view engine', 'hbs');
app.set('views', templatePath);


app.get('/', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;

        
        const user = await User.findOne({ name });
        if (!user) {
            return res.send("Invalid username or password.");
        }

        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.send("Invalid username or password.");
        }

        
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error occurred while logging in.");
    }
});


app.get('/logout', (req, res) => {
    res.redirect('/');
});


app.get('/signup', (req, res) => {
    res.render('signup');
});


app.post('/signup', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, password } = req.body;

       
        const existingUser = await User.findOne({ name });
        if (existingUser) {
            return res.send("User already exists.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            password: hashedPassword,
        });

        await newUser.save();

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error occurred while signing up.");
    }
});

app.get('/home', async (req, res) => {
    try {
        const posts = await Post.find();
        res.render('home', { posts });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error rendering home page.");
    }
});


app.get('/chatbox', async (req, res) => {
    try {
        // Retrieve all users from the database
        const users = await User.find({}, 'name'); // Retrieve only the 'name' field

        res.render('chatbox', { users }); // Pass the retrieved users to the chatbox view
    } catch (error) {
        console.error(error);
        res.status(500).send("Error rendering chatbox page.");
    }
});


app.get('/setting', async (req, res) => {
    res.render('setting');
});

app.get('/terms', async (req, res) => {
    res.render('terms');
});

app.get('/help', async (req, res) => {
    res.render('help');
});


app.post('/send-message', async (req, res) => {
    try {
        const { sender, receiver, content, imageUrl } = req.body;

        
        const senderUser = await User.findOne({ name: sender });
        const receiverUser = await User.findOne({ name: receiver });

        if (!senderUser || !receiverUser) {
            return res.status(404).send('Sender or receiver not found.');
        }

        // Create a new message document
        const newMessage = new Message({
            sender: senderUser._id,
            receiver: receiverUser._id,
            content,
            imageUrl,
        });

        
        await newMessage.save();

        res.status(200).send('Message sent successfully.');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error occurred while sending message.");
    }
});


app.get('/fetch-messages', async (req, res) => {
    try {
        const { sender, receiver } = req.query;

        
        const senderUser = await User.findOne({ name: sender });
        const receiverUser = await User.findOne({ name: receiver });

        if (!senderUser || !receiverUser) {
            return res.status(404).send('Sender or receiver not found.');
        }

       
        const messages = await Message.find({
            $or: [
                { sender: senderUser._id, receiver: receiverUser._id },
                { sender: receiverUser._id, receiver: senderUser._id },
            ]
        }).sort({ createdAt: 1 }); // Sort by creation date

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error occurred while fetching messages.");
    }
});


app.post('/change-password', async (req, res) => {
    try {
        const { name, currentPassword, newPassword } = req.body;

        // Find the user by the provided name
        const user = await User.findOne({ name });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the current password matches the password in the database
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }

        
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await User.updateOne({ name }, { password: hashedNewPassword });

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while changing password.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
