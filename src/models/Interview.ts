import mongoose, { Schema, model, models } from "mongoose";

const EvaluationSchema = new Schema(
  {
    technicalScore: Number,
    correctness: { type: String, enum: ["correct", "partial", "incorrect"] },
    coveredPoints: [String],
    missedPoints: [String],
    communicationNotes: String,
    confidenceSignals: String,
    feedback: String,
  },
  { _id: false }
);

const TeacherSchema = new Schema(
  {
    explanation: String,
    correctAnswer: String,
    example: String,
    tip: String,
  },
  { _id: false }
);

const AnswerSchema = new Schema(
  {
    transcript: String,
    audioUrl: String,
    durationSec: Number,
    evaluation: EvaluationSchema,
    teacher: TeacherSchema,
    answeredAt: Date,
  },
  { _id: false }
);

const QuestionSchema = new Schema({
  order: Number,
  isFollowUp: Boolean,
  topic: String,
  subTopic: String,
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
  type: { type: String, enum: ["conceptual", "coding", "behavioral"] },
  text: String,
  keyPoints: [String],
  idealAnswer: String,
  answer: AnswerSchema,
});

const ReportSchema = new Schema(
  {
    scores: {
      technical: Number,
      communication: Number,
      confidence: Number,
      overallReadiness: Number,
    },
    weakTopics: [{ topic: String, score: Number, suggestion: String }],
    strongTopics: [String],
    summary: String,
    recommendations: [String],
  },
  { _id: false }
);

const InterviewSchema = new Schema(
  {
    clientId: { type: String, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    jobTitle: String,
    seniority: String,
    stack: [String],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "mixed"],
      default: "mixed",
    },
    voiceId: String,
    matchScore: Number,
    recommendedTopics: [{ topic: String, priority: String }],
    status: {
      type: String,
      enum: ["created", "in_progress", "completed"],
      default: "created",
    },
    questions: [QuestionSchema],
    report: ReportSchema,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

export type InterviewDoc = mongoose.InferSchemaType<typeof InterviewSchema>;
export default models.Interview || model("Interview", InterviewSchema);
