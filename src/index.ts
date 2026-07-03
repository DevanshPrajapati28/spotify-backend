import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import fs from 'fs';
const originalError = console.error;
console.error = (...args) => {
  originalError(...args);
  try {
    fs.appendFileSync('error.log', args.map(a => (typeof a === 'object' && a !== null) ? JSON.stringify(a, Object.getOwnPropertyNames(a)) : a).join(' ') + '\n');
  } catch (e) {}
};

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import songRoutes from './routes/songRoutes';

// Routes
app.use('/api/songs', songRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Spotify Clone API is running' });
});

// Database Connection
console.log('Checking MONGODB_URI:', process.env.MONGODB_URI ? 'Exists' : 'Missing');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spotify-clone')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Cloudinary Verification
import cloudinaryConfig from './config/cloudinary';
console.log('Checking CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Exists' : 'Missing');
cloudinaryConfig.api.ping()
  .then(() => console.log('Connected to Cloudinary'))
  .catch((err) => console.error('Cloudinary connection error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Nodemon trigger 3
