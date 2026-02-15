import express from 'express';
import {
  getAllSubjects, getSubject, getQuestions,
  saveGeneratedQuestions, exportSubject, importSubject
} from '../dal/subjects.js';
import { getAllProfiles, updateProfile } from '../dal/profiles.js';
import { requireRole, canAccessProfile } from '../middleware/auth.js';

const router = express.Router();

router.get('/subjects', (req, res, next) => {
  try {
    res.json(getAllSubjects());
  } catch (error) {
    next(error);
  }
});

router.get('/subjects/:subjectId/questions', (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { theme } = req.query;

    const subject = getSubject(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const result = getQuestions(subjectId, theme);
    if (result?.notFound === 'theme') {
      return res.status(404).json({ error: 'Theme not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/profiles', (req, res, next) => {
  try {
    res.json(getAllProfiles());
  } catch (error) {
    next(error);
  }
});

// PUT /api/profiles/:profileId - Update profile settings
router.put('/profiles/:profileId', (req, res, next) => {
  try {
    const { profileId } = req.params;
    if (!canAccessProfile(req.user, profileId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updates = req.body;

    const profile = updateProfile(profileId, updates);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.post('/generate/save', requireRole('admin'), (req, res, next) => {
  try {
    const { subjectId, themeId, questions, subjectMetadata, themeMetadata } = req.body;

    if (!subjectId || !themeId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { savedCount } = saveGeneratedQuestions({
      subjectId, themeId, questions, subjectMetadata, themeMetadata
    });

    res.json({
      success: true,
      message: `Saved ${savedCount} questions to ${subjectId}/${themeId}`,
      savedCount
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/subjects/:subjectId/export - Export a complete subject bundle
router.get('/subjects/:subjectId/export', (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const bundle = exportSubject(subjectId);
    if (!bundle) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

// POST /api/subjects/import - Import a subject bundle
router.post('/subjects/import', requireRole('admin'), (req, res, next) => {
  try {
    const bundle = req.body;

    // Validate structure
    if (!bundle.subject || !bundle.questionFiles) {
      return res.status(400).json({ error: 'Invalid import bundle: missing subject or questionFiles' });
    }

    if (!bundle.subject.id || !bundle.subject.name || !Array.isArray(bundle.subject.themes)) {
      return res.status(400).json({ error: 'Invalid import bundle: subject missing required fields (id, name, themes array)' });
    }

    const { subjectId, totalQuestions } = importSubject(bundle);

    res.json({
      success: true,
      message: `Imported "${bundle.subject.name}" with ${totalQuestions} questions`,
      subjectId,
      totalQuestions
    });
  } catch (error) {
    next(error);
  }
});

export default router;
