import mongoose, { Schema, model, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: String,
    stack: [String],
    summary: String,
  },
  { _id: false }
);

const ResumeSchema = new Schema(
  {
    fileName: String,
    rawText: { type: String, required: true },
    parsed: {
      skills: [String],
      experienceYears: Number,
      roles: [String],
      education: [String],
      projects: [ProjectSchema],
    },
    status: {
      type: String,
      enum: ["parsed", "failed"],
      default: "parsed",
    },
  },
  { timestamps: true }
);

export type ResumeDoc = mongoose.InferSchemaType<typeof ResumeSchema>;
export default models.Resume || model("Resume", ResumeSchema);
