import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  log_id: { type: Number, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  case_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cases', default: null },
  target_user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('AuditLog', auditLogSchema, 'AuditLog');
