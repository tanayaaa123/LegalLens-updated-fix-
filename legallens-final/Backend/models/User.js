import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  department: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: null },
  Region: { type: String, default: '' },
});

export default mongoose.model('Users', userSchema, 'Users');
