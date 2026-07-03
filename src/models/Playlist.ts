import mongoose, { Document, Schema } from 'mongoose';

export interface IPlaylist extends Document {
  name: string;
  songs: mongoose.Types.ObjectId[];
  coverImage?: string;
}

const PlaylistSchema: Schema = new Schema({
  name: { type: String, required: true },
  songs: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
  coverImage: { type: String },
}, {
  timestamps: true,
});

export default mongoose.model<IPlaylist>('Playlist', PlaylistSchema);
