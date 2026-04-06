import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema({
  evidence_id: { type: Number, required: true, unique: true },
  case_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cases",
    required: true,
  },
  case_title: { type: String, required: true },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String },
  file_url: { type: String },
  file_name: { type: String },
  file_type: { type: String },
  verified: { type: Boolean, default: false },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  verified_note: { type: String, default: "" },
  verified_at: { type: Date },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model("Evidence", evidenceSchema, "Evidence");
