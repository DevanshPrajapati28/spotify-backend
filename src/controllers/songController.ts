import { Request, Response } from 'express';
import Song from '../models/Song';
import Playlist from '../models/Playlist';
import cloudinary from '../config/cloudinary';
import * as mm from 'music-metadata';

export const uploadSong = async (req: Request, res: Response): Promise<void> => {
  console.log('--- uploadSong called ---', req.originalUrl);
  try {
    const { title, artist, album, genre, duration } = req.body;
    
    // multer-storage-cloudinary populates req.files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.audio || !files.coverImage) {
      res.status(400).json({ error: 'Audio file and cover image are required' });
      return;
    }

    const audioUrl = files.audio[0].path;
    const coverImage = files.coverImage[0].path;

    const newSong = new Song({
      title,
      artist,
      album,
      genre,
      audioUrl,
      coverImage,
      duration: Number(duration),
    });

    await newSong.save();
    res.status(201).json(newSong);
  } catch (error) {
    console.error('Error uploading song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSongs = async (req: Request, res: Response): Promise<void> => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSong = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const song = await Song.findById(id);
    if (!song) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    if (song.audioUrl) {
      const audioMatch = /upload\/(?:v\d+\/)?([^\.]+)/.exec(song.audioUrl);
      if (audioMatch) {
        await cloudinary.uploader.destroy(audioMatch[1], { resource_type: 'video' });
      }
    }
    
    if (song.coverImage) {
      const imageMatch = /upload\/(?:v\d+\/)?([^\.]+)/.exec(song.coverImage);
      if (imageMatch) {
        await cloudinary.uploader.destroy(imageMatch[1], { resource_type: 'image' });
      }
    }

    await Song.findByIdAndDelete(id);
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalSongs = await Song.countDocuments();
    const totalAlbums = (await Song.distinct('album')).length;
    const totalArtists = (await Song.distinct('artist')).length;
    const totalPlaylists = await Playlist.countDocuments();
    
    res.json({
      totalSongs,
      totalAlbums,
      totalArtists,
      totalPlaylists
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const { albumName } = req.params;
    const songs = await Song.find({ album: albumName });
    
    for (const song of songs) {
      if (song.audioUrl) {
        const audioMatch = /upload\/(?:v\d+\/)?([^\.]+)/.exec(song.audioUrl);
        if (audioMatch) {
          await cloudinary.uploader.destroy(audioMatch[1], { resource_type: 'video' }).catch(console.error);
        }
      }
      
      if (song.coverImage) {
        const imageMatch = /upload\/(?:v\d+\/)?([^\.]+)/.exec(song.coverImage);
        if (imageMatch) {
          await cloudinary.uploader.destroy(imageMatch[1], { resource_type: 'image' }).catch(console.error);
        }
      }
    }

    await Song.deleteMany({ album: albumName });
    res.json({ message: 'Album and its songs deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const song = await Song.findById(id);
    if (!song) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }
    song.liked = !song.liked;
    await song.save();
    res.json(song);
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const parseMetadata = async (req: Request, res: Response): Promise<void> => {
  console.log('--- parseMetadata called ---', req.originalUrl);
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const results = [];
    for (const file of files) {
      try {
        const metadata = await mm.parseBuffer(file.buffer, file.mimetype);
        const { common, format } = metadata;
        
        let coverBase64 = null;
        if (common.picture && common.picture.length > 0) {
          const picture = common.picture[0];
          coverBase64 = `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`;
        }

        let title = common.title;
        let artist = common.artist;
        if (!title || !artist) {
          const filename = file.originalname.replace(/\.[^/.]+$/, "");
          const parts = filename.split(' - ');
          if (parts.length >= 2) {
             if (!artist) artist = parts[0].trim();
             if (!title) title = parts.slice(1).join(' - ').trim();
          } else {
             if (!title) title = filename;
          }
        }

        results.push({
          originalName: file.originalname,
          title: title || '',
          artist: artist || '',
          album: common.album || '',
          genre: common.genre ? common.genre[0] : '',
          year: common.year || '',
          duration: format.duration ? Math.floor(format.duration) : 0,
          coverImage: coverBase64,
        });
      } catch (err) {
        const filename = file.originalname.replace(/\.[^/.]+$/, "");
        const parts = filename.split(' - ');
        let title = filename;
        let artist = '';
        if (parts.length >= 2) {
           artist = parts[0].trim();
           title = parts.slice(1).join(' - ').trim();
        }
        results.push({
          originalName: file.originalname,
          title,
          artist,
          album: '',
          genre: '',
          year: '',
          duration: 0,
          coverImage: null,
        });
      }
    }
    res.json(results);
  } catch (error) {
    console.error('Error parsing metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
