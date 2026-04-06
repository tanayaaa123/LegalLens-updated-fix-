import mongoose from 'mongoose';

const caseMemberSchema = new mongoose.Schema({
  case_member_id:{ type: Number, required: true, unique: true },
  case_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cases', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  role: { type: String },
  
},{ versionKey: false });

export default mongoose.model('CaseMembers', caseMemberSchema, 'CaseMembers');
