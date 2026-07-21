import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    repoUrl: {
      type: String,
      required: true,
    },
    repoMetadata: {
      name: { type: String, required: true },
      owner: { type: String, required: true },
      description: { type: String, default: '' },
      primaryLanguage: { type: String, default: 'Unknown' },
      stars: { type: Number, default: 0 },
      forks: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },
    analysisResults: {
      score: { type: Number, required: true },
      scoreJustification: { type: String, required: true },
      summary: { type: String, required: true },
      structureAssessment: { type: String, required: true },
      bestPractices: {
        namingConventions: { type: String, default: '' },
        errorHandling: { type: String, default: '' },
        securityRedFlags: { type: String, default: '' },
        missingTestsOrDocs: { type: String, default: '' },
      },
      actionableSuggestions: [{ type: String }],
      keyFindings: [
        {
          type: { type: String, enum: ['success', 'warning'] },
          finding: { type: String },
        },
      ],
    },
    analyzedFiles: [{ type: String }],
    chatHistory: [
      {
        role: { type: String, enum: ['user', 'model'], required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
