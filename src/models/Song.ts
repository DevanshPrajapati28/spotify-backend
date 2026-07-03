import mongoose, { Document, Schema } from 'mongoose';

export interface ISong extends Document {
  title: string;
  artist: string;
  album: string;
  genre: string;
  coverImage: string;
  audioUrl: string;
  duration: number;
  plays: number;
  likes: number;
  liked: boolean;
  createdAt: Date;
}

const SongSchema: Schema = new Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String, required: true },
  genre: { type: String, required: true },
  coverImage: { type: String, required: true },
  audioUrl: { type: String, required: true },
  duration: { type: Number, required: true }, // in seconds
  plays: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  liked: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export default mongoose.model<ISong>('Song', SongSchema);
