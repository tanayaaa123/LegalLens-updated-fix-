import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  event_id: { type: Number, required: true, unique: true },
  case_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cases', required: true },
  title: { type: String, required: true },
  description: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  event_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Events', eventSchema, 'Events');
