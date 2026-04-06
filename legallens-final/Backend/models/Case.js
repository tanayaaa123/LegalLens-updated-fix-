import mongoose from "mongoose";

const caseSchema = new mongoose.Schema(
  {
    case_id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["Open", "Close", "Archived"],
      default: "Open",
    },
    priority: { type: Number, enum: [1, 2, 3], default: 1 }, // 1=low,2=medium,3=high
    start_date: { type: Date, default: Date.now },
    crime_date: { type: Date },
    end_date: { type: Date },
  },
  { versionKey: false },
);

export default mongoose.model("Cases", caseSchema, "Cases");
