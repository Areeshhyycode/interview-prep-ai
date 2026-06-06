import mongoose, { Schema, model, models } from "mongoose";

const JobSchema = new Schema(
  {
    title: { type: String, default: "Untitled Role" },
    company: String,
    rawText: { type: String, required: true },
    parsed: {
      requiredSkills: [String],
      niceToHave: [String],
      seniority: { type: String, enum: ["junior", "mid", "senior"], default: "mid" },
      focusAreas: [String],
    },
  },
  { timestamps: true }
);

export type JobDoc = mongoose.InferSchemaType<typeof JobSchema>;
export default models.Job || model("Job", JobSchema);
