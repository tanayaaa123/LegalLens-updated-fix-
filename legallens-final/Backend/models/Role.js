import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  role_id: { type: Number, required: true, unique: true },
  role_name: { type: String, required: true },
  permissions: [{ type: String }],
  role_description: { type: String },
});

export default mongoose.model('Roles', roleSchema, 'Roles');
