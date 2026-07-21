import {
  parseGitHubUrl,
  fetchRepoMetadata,
  fetchRepoFiles,
  fetchGitHubContents,
  fetchMultipleFiles
} from '../services/githubService.js';
import {
  analyzeRepository,
  buildChatPrompt,
  generateChatAnswer
} from '../services/geminiService.js';
import Analysis from '../models/Analysis.js';
import { z } from 'zod';

const repoUrlSchema = z.string().url().refine(
  (url) => url.includes('github.com'),
  { message: 'Must be a valid GitHub URL' }
);

/**
 * @desc    Submit GitHub repository URL and perform AI analysis
 * @route   POST /api/analysis/analyze
 * @access  Private (Auth required, rate-limited)
 */
export const analyzeRepo = async (req, res) => {
  try {
    // 1. Validate Input
    const validation = repoUrlSchema.safeParse(req.body.repoUrl);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    const { repoUrl } = req.body;
    console.log(`Received analysis request for URL: ${repoUrl} from user: ${req.user.email}`);

    // 2. Parse URL to get owner and repo name
    let owner, repo;
    try {
      const parsed = parseGitHubUrl(repoUrl);
      owner = parsed.owner;
      repo = parsed.repo;
    } catch (urlErr) {
      return res.status(400).json({ message: urlErr.message });
    }

    // 3. Fetch repo metadata (checks if public and exists)
    let metadata;
    try {
      metadata = await fetchRepoMetadata(owner, repo);
    } catch (metaErr) {
      return res.status(400).json({ message: metaErr.message });
    }

    // 4. Select and fetch files (keeps payload small)
    let filesData;
    try {
      filesData = await fetchRepoFiles(owner, repo, metadata.defaultBranch);
    } catch (fileErr) {
      return res.status(500).json({ message: fileErr.message });
    }

    if (!filesData.contents || filesData.contents.length === 0) {
      return res.status(400).json({
        message: 'No code or markdown files could be retrieved from this repository. Ensure it is not empty.',
      });
    }

    // 5. Send to Gemini for analysis
    let analysisResults;
    try {
      analysisResults = await analyzeRepository(metadata, filesData.contents);
    } catch (geminiErr) {
      return res.status(500).json({ message: geminiErr.message });
    }

    // 6. Save Analysis to MongoDB
    const analysis = new Analysis({
      user: req.user._id,
      repoUrl,
      repoMetadata: {
        name: metadata.name,
        owner: metadata.owner,
        description: metadata.description,
        primaryLanguage: metadata.primaryLanguage,
        stars: metadata.stars,
        forks: metadata.forks,
        lastUpdated: metadata.lastUpdated,
      },
      analysisResults,
      analyzedFiles: filesData.analyzedFiles,
    });

    await analysis.save();

    res.status(201).json(analysis);
  } catch (error) {
    console.error('General analysis error:', error);
    res.status(500).json({ message: 'Internal server error during analysis. Please try again.' });
  }
};

/**
 * @desc    Get user's past analysis history
 * @route   GET /api/analysis/history
 * @access  Private
 */
export const getHistory = async (req, res) => {
  try {
    // Return summary details of past runs sorted by newest
    const history = await Analysis.find({ user: req.user._id })
      .select('repoUrl repoMetadata analysisResults.score analysisResults.summary createdAt')
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ message: 'Failed to retrieve analysis history' });
  }
};

/**
 * @desc    Get details of a specific past analysis
 * @route   GET /api/analysis/history/:id
 * @access  Private
 */
export const getAnalysisById = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found or unauthorized' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Fetch analysis details error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid analysis ID format' });
    }
    res.status(500).json({ message: 'Failed to retrieve analysis details' });
  }
};

/**
 * @desc    Fetch file/directory contents from GitHub using specific analysis configuration
 * @route   GET /api/analysis/history/:id/contents
 * @access  Private
 */
export const getRepoContents = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis report not found or unauthorized' });
    }

    const { owner, name } = analysis.repoMetadata;
    const path = req.query.path || '';

    console.log(`Fetching repository contents for: ${owner}/${name}, path: "${path}"`);
    const contents = await fetchGitHubContents(owner, name, path);

    // If it's a file with base64 encoding, decode it for the frontend
    if (contents && contents.type === 'file' && contents.encoding === 'base64') {
      contents.content = Buffer.from(contents.content, 'base64').toString('utf-8');
    }

    res.json(contents);
  } catch (error) {
    console.error('Error in getRepoContents:', error.message);
    res.status(500).json({ message: error.message || 'Failed to retrieve repository contents.' });
  }
};

/**
 * @desc    Ask a question about the repository and get Gemini model response using contextual files
 * @route   POST /api/analysis/history/:id/chat
 * @access  Private
 */
export const askQuestionAboutRepo = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ message: 'A non-empty question string is required.' });
    }

    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis report not found or unauthorized' });
    }

    const { owner, name } = analysis.repoMetadata;
    const analyzedFiles = analysis.analyzedFiles || [];

    console.log(`User query on repo "${name}": "${question}"`);

    // 1. Fetch contents for the key file heuristic in parallel
    const fileContents = await fetchMultipleFiles(owner, name, analyzedFiles);

    // 2. Build prompt including capped conversation history
    const prompt = buildChatPrompt(analysis, fileContents, question);

    // 3. Generate response using Gemini
    const answer = await generateChatAnswer(prompt);

    // 4. Save both user message and model response to database history
    analysis.chatHistory = analysis.chatHistory || [];
    analysis.chatHistory.push({ role: 'user', message: question });
    analysis.chatHistory.push({ role: 'model', message: answer });
    await analysis.save();

    res.status(201).json({ role: 'model', message: answer });
  } catch (error) {
    console.error('Error in askQuestionAboutRepo:', error.message);
    res.status(500).json({ message: error.message || 'Failed to generate answer to your question.' });
  }
};
