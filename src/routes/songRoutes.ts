import { Router } from 'express';
import { uploadSong, getSongs, deleteSong, toggleLike, parseMetadata, getAdminStats, deleteAlbum } from '../controllers/songController';
import { uploadAudio, uploadImage } from '../config/cloudinary';
import multer from 'multer';

const router = Router();

// Workaround for multiple file uploads with different storages
// We use a temporary local storage or memory storage for initial parsing if needed, 
// but since we want to send them directly to Cloudinary, we can use a custom middleware
// to handle the two different multer instances, OR just use one Cloudinary storage 
// that accepts both and sorts them by folder. For simplicity, we can use memory storage
// and upload to Cloudinary manually, or just use one of them.
// Let's create a combined upload middleware using a generic Cloudinary storage.

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const combinedStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    if (file.fieldname === 'audio') {
      let format = undefined;
      // If the original name has a weird extension like .pm, force mp3
      if (file.originalname && file.originalname.endsWith('.pm')) {
        format = 'mp3';
      }
      return {
        folder: 'spotify-clone/audio',
        resource_type: 'video',
        ...(format && { format }),
      };
    }
    return {
      folder: 'spotify-clone/images',
    };
  },
});

const uploadCombined = multer({ storage: combinedStorage });

const uploadMiddleware = uploadCombined.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);

router.post('/', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('--- MULTER/CLOUDINARY UPLOAD ERROR ---');
      console.error(err);
      return res.status(500).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, uploadSong);

const memoryUpload = multer({ storage: multer.memoryStorage() });
router.post('/parse-metadata', memoryUpload.any(), parseMetadata);

router.get('/admin/stats', getAdminStats);
router.get('/', getSongs);
router.put('/:id/like', toggleLike);
router.delete('/:id', deleteSong);
router.delete('/album/:albumName', deleteAlbum);

export default router;
