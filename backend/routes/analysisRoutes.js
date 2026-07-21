import express from 'express';
import { 
  analyzeRepo, 
  getHistory, 
  getAnalysisById, 
  getRepoContents, 
  askQuestionAboutRepo 
} from '../controllers/analysisController.js';
import { protect } from '../middleware/authMiddleware.js';
import { analysisLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply auth protection to all routes below
router.use(protect);

router.post('/analyze', analysisLimiter, analyzeRepo);
router.get('/history', getHistory);
router.get('/history/:id', getAnalysisById);
router.get('/history/:id/contents', getRepoContents);
router.post('/history/:id/chat', askQuestionAboutRepo);

export default router;
