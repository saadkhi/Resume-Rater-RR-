import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// NLP & Model Logic
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could', 'did',
  'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

// Load training dataset and build category centroids & IDF
const categoryCentroids = {};
const idf = {};
let totalDocs = 0;

function trainClassifier() {
  const datasetPath = path.join(__dirname, 'data', 'gpt_dataset.csv');
  if (!fs.existsSync(datasetPath)) {
    console.warn('Dataset file not found at:', datasetPath);
    return;
  }

  const content = fs.readFileSync(datasetPath, 'utf8');
  const lines = content.split('\n');
  const rows = [];
  const categoryDocs = {};
  const docFreq = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const category = line.substring(0, commaIdx).trim().replace(/^"|"$/g, '');
    const resume = line.substring(commaIdx + 1).trim().replace(/^"|"$/g, '');
    rows.push({ category, resume });
  }

  totalDocs = rows.length;
  for (const r of rows) {
    if (!categoryDocs[r.category]) categoryDocs[r.category] = [];
    categoryDocs[r.category].push(r.resume);
    const words = new Set(tokenize(r.resume));
    for (const w of words) {
      docFreq[w] = (docFreq[w] || 0) + 1;
    }
  }

  for (const [w, df] of Object.entries(docFreq)) {
    idf[w] = Math.log((1 + totalDocs) / (1 + df)) + 1;
  }

  for (const [cat, docs] of Object.entries(categoryDocs)) {
    const combined = docs.join(' ');
    categoryCentroids[cat] = computeTfidfVector(combined);
  }

  console.log(`Classifier trained on ${totalDocs} documents across ${Object.keys(categoryCentroids).length} categories.`);
}

function computeTfidfVector(text) {
  const tokens = tokenize(text);
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  const vec = {};
  let norm = 0;
  const defaultIdf = Math.log(1 + (totalDocs || 1)) + 1;
  for (const [t, count] of Object.entries(tf)) {
    const weight = count * (idf[t] || defaultIdf);
    vec[t] = weight;
    norm += weight * weight;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (const t in vec) vec[t] /= norm;
  }
  return vec;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (const t in vecA) {
    if (vecB[t]) {
      dot += vecA[t] * vecB[t];
    }
  }
  return dot;
}

function predictCategory(resumeText) {
  const resumeVec = computeTfidfVector(resumeText);
  let bestCategory = 'Unknown';
  let bestScore = -1;

  for (const [cat, catVec] of Object.entries(categoryCentroids)) {
    const sim = cosineSimilarity(resumeVec, catVec);
    if (sim > bestScore) {
      bestScore = sim;
      bestCategory = cat;
    }
  }
  return bestCategory;
}

function rateResumeSimilarity(resumeVec, jobDescVec) {
  const similarityScore = cosineSimilarity(resumeVec, jobDescVec);
  let matchRating = 'Low Match';
  if (similarityScore >= 0.75) {
    matchRating = 'High Match';
  } else if (similarityScore >= 0.50) {
    matchRating = 'Medium Match';
  }
  return { matchRating, similarityScore };
}

async function parsePdfDetails(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse(new Uint8Array(fileBuffer));
    const result = await parser.getText();
    const text = result?.text || '';
    const pages = result?.total || (result?.pages ? result.pages.length : 1);
    return { text, pages };
  } catch (err) {
    console.error('Error parsing PDF details:', err);
    throw err;
  }
}

async function pdfToText(filePath) {
  try {
    const { text } = await parsePdfDetails(filePath);
    return text;
  } catch (err) {
    console.error('Error parsing PDF:', err);
    return '';
  }
}

function cleanResume(txt) {
  let cleanText = txt.replace(/http\S+\s*/g, ' ');
  cleanText = cleanText.replace(/\b(RT|cc)\b/g, ' ');
  cleanText = cleanText.replace(/#\S+\s*/g, ' ');
  cleanText = cleanText.replace(/@\S+/g, ' ');
  cleanText = cleanText.replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, ' ');
  cleanText = cleanText.replace(/[^\x00-\x7f]/g, ' ');
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  return cleanText;
}

function extractSectionRegex(cvText, sectionName, endKeywords) {
  const lines = cvText.split(/\r?\n/);
  let capturing = false;
  const capturedLines = [];
  const startRegex = new RegExp('^\\s*' + sectionName + '[:\\s]*$', 'i');
  const endRegex = new RegExp('^\\s*(' + endKeywords.join('|') + ')[:\\s]*$', 'i');

  for (const line of lines) {
    if (!capturing) {
      if (startRegex.test(line.trim())) {
        capturing = true;
        capturedLines.push(line);
      }
    } else {
      if (endRegex.test(line.trim())) {
        break;
      }
      capturedLines.push(line);
    }
  }

  if (capturedLines.length > 0) {
    return capturedLines.join('\n').trim();
  }

  // Fallback: search substring boundary
  const subIdx = cvText.search(new RegExp('(^|\\n)\\s*' + sectionName, 'i'));
  if (subIdx !== -1) {
    const fromSection = cvText.slice(subIdx);
    const endMatch = fromSection.slice(sectionName.length + 1).search(new RegExp('(^|\\n)\\s*(' + endKeywords.join('|') + ')', 'im'));
    if (endMatch !== -1) {
      return fromSection.slice(0, sectionName.length + 1 + endMatch).trim();
    }
    return fromSection.trim();
  }

  return `${sectionName} section not found.`;
}

function saveToCsv(data) {
  const csvFile = path.join(__dirname, 'cv_sections.csv');
  const fileExists = fs.existsSync(csvFile);

  const escapeCsv = (val) => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const line = [
    escapeCsv(data.Name),
    escapeCsv(data.Category),
    escapeCsv(data.Education),
    escapeCsv(data.Experience),
    escapeCsv(data.Skills),
    escapeCsv(data.Projects),
    data['Probability Score']
  ].join(',') + '\n';

  if (!fileExists) {
    const header = 'Name,Category,Education,Experience,Skills,Projects,Probability Score\n';
    fs.writeFileSync(csvFile, header + line, 'utf8');
  } else {
    fs.appendFileSync(csvFile, line, 'utf8');
  }
}

function computeDetailedMatchMetrics(resumeText, jobDescriptionText, resumeSections = null) {
  const cleanedResume = cleanResume(resumeText);
  const cleanedJd = cleanResume(jobDescriptionText);

  const resumeVec = computeTfidfVector(cleanedResume);
  const jdVec = computeTfidfVector(cleanedJd);

  const { matchRating, similarityScore } = rateResumeSimilarity(resumeVec, jdVec);
  const roundedScore = Number(similarityScore.toFixed(2));
  const percentage = Math.min(100, Math.max(0, Math.round(roundedScore * 100)));

  // Extract top keywords from JD
  const jdTokens = Object.keys(jdVec).sort((a, b) => jdVec[b] - jdVec[a]);
  const topJdTokens = jdTokens.slice(0, 8);

  const keywordAlignment = topJdTokens.map(token => {
    const jdVal = Math.min(100, Math.round((jdVec[token] || 0) * 160));
    const resumeVal = Math.min(100, Math.round((resumeVec[token] || 0) * 160));
    return {
      keyword: token.charAt(0).toUpperCase() + token.slice(1),
      resumeScore: resumeVal,
      jobScore: Math.max(jdVal, 35),
      matched: resumeVal > 0
    };
  });

  const matchedTokensCount = topJdTokens.filter(t => (resumeVec[t] || 0) > 0).length;
  const keywordCoverage = topJdTokens.length > 0 ? Math.round((matchedTokensCount / topJdTokens.length) * 100) : percentage;

  // Skills alignment score
  let skillsScore = percentage;
  if (resumeSections?.Skills && !resumeSections.Skills.toLowerCase().includes('not found')) {
    const skillsVec = computeTfidfVector(cleanResume(resumeSections.Skills));
    const skillSim = cosineSimilarity(skillsVec, jdVec);
    skillsScore = Math.min(100, Math.round(skillSim * 120) + 10);
  } else {
    skillsScore = Math.max(15, Math.round(percentage * 0.9));
  }

  // Projects / Experience score
  let projectsScore = percentage;
  if (resumeSections?.Projects && !resumeSections.Projects.toLowerCase().includes('not found')) {
    const projVec = computeTfidfVector(cleanResume(resumeSections.Projects));
    const projSim = cosineSimilarity(projVec, jdVec);
    projectsScore = Math.min(100, Math.round(projSim * 120) + 10);
  } else {
    projectsScore = Math.max(10, Math.round(percentage * 0.85));
  }

  const domainScore = Math.min(100, Math.max(percentage, Math.round((percentage + keywordCoverage) / 2)));

  const dimensions = [
    { dimension: 'Cosine Fit', score: Math.max(percentage, 5), target: 100, fullMark: 100 },
    { dimension: 'Key Skills', score: Math.max(skillsScore, 5), target: 100, fullMark: 100 },
    { dimension: 'Keywords', score: Math.max(keywordCoverage, 5), target: 100, fullMark: 100 },
    { dimension: 'Projects', score: Math.max(projectsScore, 5), target: 100, fullMark: 100 },
    { dimension: 'Domain Scope', score: Math.max(domainScore, 5), target: 100, fullMark: 100 }
  ];

  return {
    similarityScore: roundedScore,
    matchRating,
    percentage,
    dimensions,
    keywordAlignment,
    matchedCount: matchedTokensCount,
    totalKeywordsChecked: topJdTokens.length
  };
}

// Helper to extract full resume analysis
async function analyzeResumePdf(filePath, originalName, jobDescriptionText = '', jobKeywords = '') {
  const { text: rawText, pages } = await parsePdfDetails(filePath);
  const cleanedResume = cleanResume(rawText);

  const sections = {
    Education: extractSectionRegex(rawText, 'Education', ['Experience', 'Skills', 'Projects', 'Certifications', 'Languages']),
    Experience: extractSectionRegex(rawText, 'Experience', ['Skills', 'Projects', 'Certifications', 'Languages']),
    Skills: extractSectionRegex(rawText, 'Skills', ['Experience', 'Projects', 'Certifications', 'Languages']),
    Projects: extractSectionRegex(rawText, 'Projects', ['Certifications', 'Languages'])
  };

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const characterCount = rawText.length;
  const category = predictCategory(cleanedResume);

  // Match against job description if provided
  let match = null;
  const targetJd = jobDescriptionText.trim() || jobKeywords.trim() || '';
  if (targetJd) {
    const detailedMatch = computeDetailedMatchMetrics(cleanedResume, targetJd, sections);
    match = {
      ...detailedMatch,
      targetJob: targetJd.length > 80 ? targetJd.substring(0, 80) + '...' : targetJd
    };

    saveToCsv({
      Name: originalName || 'Unknown',
      Category: category,
      Education: sections.Education,
      Experience: sections.Experience,
      Skills: sections.Skills,
      Projects: sections.Projects,
      'Probability Score': detailedMatch.similarityScore
    });
  }

  return {
    filename: originalName,
    pages,
    stats: {
      wordCount,
      characterCount,
      pageCount: pages
    },
    category,
    sections,
    rawText,
    cleanedText: cleanedResume,
    match
  };
}

// REST API Endpoints

// 1. API: Parse uploaded PDF resume
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded. Please select or drag a PDF resume.'
      });
    }

    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type. Please upload a valid PDF document.'
      });
    }

    const jobDescriptionText = req.body.job_description_text || '';
    const jobKeywords = req.body.job_keywords || '';

    const analysis = await analyzeResumePdf(req.file.path, req.file.originalname, jobDescriptionText, jobKeywords);

    return res.json({
      success: true,
      ...analysis
    });
  } catch (err) {
    console.error('API /api/parse-resume error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse resume: ' + err.message
    });
  }
});

// 2. API: List available sample resumes for quick testing
app.get('/api/sample-resumes', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const samples = pdfs.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stat = fs.statSync(filePath);
      return {
        filename,
        displayName: filename.replace(/^\d+_/, '').replace(/\.pdf$/i, '').replace(/_/g, ' '),
        sizeBytes: stat.size,
        sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`
      };
    });
    return res.json({ success: true, samples });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. API: Parse an existing sample resume
app.post('/api/parse-sample', async (req, res) => {
  try {
    const { sampleName, job_description_text, job_keywords } = req.body;
    if (!sampleName) {
      return res.status(400).json({ success: false, error: 'sampleName is required.' });
    }

    // Check in uploadsDir
    const safeSampleName = path.basename(sampleName);
    let targetPath = path.join(uploadsDir, safeSampleName);
    if (!fs.existsSync(targetPath)) {
      // Also check root uploads dir
      const rootUploads = path.join(__dirname, 'uploads', safeSampleName);
      if (fs.existsSync(rootUploads)) {
        targetPath = rootUploads;
      } else {
        return res.status(404).json({ success: false, error: 'Sample file not found: ' + safeSampleName });
      }
    }

    const analysis = await analyzeResumePdf(targetPath, safeSampleName, job_description_text || '', job_keywords || '');

    return res.json({
      success: true,
      ...analysis
    });
  } catch (err) {
    console.error('API /api/parse-sample error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse sample resume: ' + err.message
    });
  }
});

// 4. API: Interactive Match Evaluator against Job Description
app.post('/api/evaluate-match', (req, res) => {
  try {
    const { resumeText, jobDescriptionText, resumeSections } = req.body;
    if (!resumeText || !jobDescriptionText) {
      return res.status(400).json({
        success: false,
        error: 'Both resumeText and jobDescriptionText are required.'
      });
    }

    const detailedMetrics = computeDetailedMatchMetrics(resumeText, jobDescriptionText, resumeSections || null);

    return res.json({
      success: true,
      ...detailedMetrics
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Evaluation failed: ' + err.message
    });
  }
});

// 5. API: View CSV records
app.get('/api/csv-records', (req, res) => {
  try {
    const csvFile = path.join(__dirname, 'cv_sections.csv');
    if (!fs.existsSync(csvFile)) {
      return res.json({ success: true, records: [] });
    }
    const content = fs.readFileSync(csvFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      records.push(lines[i]);
    }
    return res.json({ success: true, count: records.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    error: null,
    prediction_category: null,
    resume_match_rating: null,
    numerical_similarity_score: null,
    csv_data: null
  });
});

app.post('/upload', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'job_description', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files || {};
    const resumeFile = files.resume ? files.resume[0] : null;
    const jobDescriptionFile = files.job_description ? files.job_description[0] : null;
    const jobDescriptionText = req.body.job_description_text ? req.body.job_description_text.trim() : '';
    const jobKeywords = req.body.job_keywords ? req.body.job_keywords.trim() : '';

    if (!resumeFile || (!jobDescriptionFile && !jobDescriptionText && !jobKeywords)) {
      return res.render('index', {
        error: 'No file part',
        prediction_category: null,
        resume_match_rating: null,
        numerical_similarity_score: null,
        csv_data: null
      });
    }

    // Extract text from resume PDF
    const resumeText = await pdfToText(resumeFile.path);
    const cleanedResume = cleanResume(resumeText);

    // Extract sections
    const resumeSections = {
      Education: extractSectionRegex(resumeText, 'Education', ['Experience', 'Skills', 'Projects', 'Certifications', 'Languages']),
      Experience: extractSectionRegex(resumeText, 'Experience', ['Skills', 'Projects', 'Certifications', 'Languages']),
      Skills: extractSectionRegex(resumeText, 'Skills', ['Experience', 'Projects', 'Certifications', 'Languages']),
      Projects: extractSectionRegex(resumeText, 'Projects', ['Certifications', 'Languages'])
    };

    // Determine Job Description text
    let jdRawText = '';
    if (jobDescriptionFile) {
      jdRawText = await pdfToText(jobDescriptionFile.path);
    } else if (jobDescriptionText) {
      jdRawText = jobDescriptionText;
    } else if (jobKeywords) {
      jdRawText = jobKeywords;
    } else {
      jdRawText = resumeSections.Education || '';
    }

    const cleanedJobDescription = cleanResume(jdRawText);

    // Vectors and Similarity
    const resumeVec = computeTfidfVector(cleanedResume);
    const jdVec = computeTfidfVector(cleanedJobDescription);

    const predictionId = predictCategory(cleanedResume);
    const { matchRating, similarityScore } = rateResumeSimilarity(resumeVec, jdVec);
    const roundedSimilarityScore = Number(similarityScore.toFixed(2));

    const name = resumeFile.originalname || 'Unknown';
    const csvData = {
      Name: name,
      Category: predictionId,
      Education: resumeSections.Education,
      Experience: resumeSections.Experience,
      Skills: resumeSections.Skills,
      Projects: resumeSections.Projects,
      'Probability Score': roundedSimilarityScore
    };
    saveToCsv(csvData);

    const csvDataForTemplate = [
      { Section: 'Education', Content: resumeSections.Education },
      { Section: 'Experience', Content: resumeSections.Experience },
      { Section: 'Skills', Content: resumeSections.Skills },
      { Section: 'Projects', Content: resumeSections.Projects }
    ];

    res.render('index', {
      error: null,
      prediction_category: predictionId,
      resume_match_rating: matchRating,
      numerical_similarity_score: roundedSimilarityScore,
      csv_data: csvDataForTemplate
    });
  } catch (err) {
    console.error('Error handling upload:', err);
    res.render('index', {
      error: 'An error occurred while evaluating the resume: ' + err.message,
      prediction_category: null,
      resume_match_rating: null,
      numerical_similarity_score: null,
      csv_data: null
    });
  }
});

// Train classifier on startup
trainClassifier();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Resume Rater app listening on http://0.0.0.0:${PORT}`);
});
