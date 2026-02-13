import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../../data');

router.get('/subjects', async (req, res, next) => {
  try {
    const subjectsPath = path.join(dataPath, 'subjects.json');
    const data = await fs.readFile(subjectsPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    next(error);
  }
});

router.get('/subjects/:subjectId/questions', async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { theme } = req.query;
    
    const subjectsPath = path.join(dataPath, 'subjects.json');
    const subjectsData = JSON.parse(await fs.readFile(subjectsPath, 'utf-8'));
    
    const subject = subjectsData.subjects.find(s => s.id === subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    let allQuestions = [];
    let categories = {};
    
    const themesToLoad = theme 
      ? subject.themes.filter(t => t.id === theme)
      : subject.themes;
    
    if (theme && themesToLoad.length === 0) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    
    for (const themeObj of themesToLoad) {
      const questionPath = path.join(dataPath, 'questions', themeObj.questionFile);
      try {
        const questionData = JSON.parse(await fs.readFile(questionPath, 'utf-8'));
        allQuestions = allQuestions.concat(questionData.questions);
        categories = { ...categories, ...questionData.categories };
      } catch (err) {
        console.error(`Error loading ${themeObj.questionFile}:`, err);
      }
    }
    
    res.json({
      subject: subjectId,
      theme: theme || 'all',
      categories,
      questions: allQuestions
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profiles', async (req, res, next) => {
  try {
    const profilesPath = path.join(dataPath, 'profiles.json');
    const data = await fs.readFile(profilesPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    next(error);
  }
});

router.post('/generate/save', async (req, res, next) => {
  try {
    const { subjectId, themeId, questions } = req.body;
    
    if (!subjectId || !themeId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const subjectsPath = path.join(dataPath, 'subjects.json');
    const subjectsData = JSON.parse(await fs.readFile(subjectsPath, 'utf-8'));
    
    let subject = subjectsData.subjects.find(s => s.id === subjectId);
    let theme = subject?.themes.find(t => t.id === themeId);
    
    if (!subject) {
      subject = {
        id: subjectId,
        name: subjectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: '📚',
        description: 'Generated subject',
        ageGroup: 'all',
        themes: []
      };
      subjectsData.subjects.push(subject);
    }
    
    if (!theme) {
      const questionFileName = `${subjectId}-${themeId}.json`;
      theme = {
        id: themeId,
        name: themeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: 'from-blue-500 to-purple-500',
        questionFile: questionFileName
      };
      subject.themes.push(theme);
      
      const newQuestionFile = {
        meta: {
          subject: subjectId,
          theme: themeId,
          version: 1,
          lastUpdated: new Date().toISOString().split('T')[0]
        },
        categories: {
          [questions[0]?.category || 'General']: {
            color: '#8b5cf6',
            bgClass: 'bg-purple-500',
            lightClass: 'bg-purple-50',
            borderClass: 'border-purple-300',
            textClass: 'text-purple-700'
          }
        },
        questions: []
      };
      
      await fs.writeFile(
        path.join(dataPath, 'questions', questionFileName),
        JSON.stringify(newQuestionFile, null, 2)
      );
    }
    
    await fs.writeFile(subjectsPath, JSON.stringify(subjectsData, null, 2));
    
    const questionFilePath = path.join(dataPath, 'questions', theme.questionFile);
    const questionData = JSON.parse(await fs.readFile(questionFilePath, 'utf-8'));
    
    const existingIds = new Set(questionData.questions.map(q => q.id));
    let counter = questionData.questions.length + 1;
    
    const newQuestions = questions.map(q => {
      let id = q.id;
      while (existingIds.has(id)) {
        id = `${subjectId.substring(0, 3)}-${String(counter++).padStart(3, '0')}`;
      }
      existingIds.add(id);
      
      if (!questionData.categories[q.category]) {
        const colors = ['purple', 'blue', 'green', 'cyan', 'indigo', 'violet'];
        const color = colors[Object.keys(questionData.categories).length % colors.length];
        questionData.categories[q.category] = {
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          bgClass: `bg-${color}-500`,
          lightClass: `bg-${color}-50`,
          borderClass: `border-${color}-300`,
          textClass: `text-${color}-700`
        };
      }
      
      return { ...q, id };
    });
    
    questionData.questions.push(...newQuestions);
    questionData.meta.lastUpdated = new Date().toISOString().split('T')[0];
    
    await fs.writeFile(questionFilePath, JSON.stringify(questionData, null, 2));
    
    res.json({
      success: true,
      message: `Saved ${newQuestions.length} questions to ${subjectId}/${themeId}`,
      savedCount: newQuestions.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;