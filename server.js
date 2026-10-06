import './src/polyfills.js';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.js';
import { billingService, checkSubscriptionAndQuota, PLANS } from './src/services/billing.js';
import { jobsService } from './src/services/jobs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel / Serverless Read-Only File System Compatibility
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
const bundledUploadsDir = path.join(__dirname, 'uploads');
const writableUploadsDir = isServerless ? path.join(os.tmpdir(), 'resume_rater_uploads') : bundledUploadsDir;

try {
  if (!fs.existsSync(writableUploadsDir)) {
    fs.mkdirSync(writableUploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Notice: Writable uploads directory warning:', err.message);
}

// Helper to resolve resume file across writable /tmp, bundled repository, and current working directory
function resolveResumePath(filename) {
  const safeName = path.basename(filename);
  
  // 1. Check writable directory
  const writablePath = path.join(writableUploadsDir, safeName);
  if (fs.existsSync(writablePath)) return writablePath;

  // 2. Check bundled uploads directory
  const bundledPath = path.join(bundledUploadsDir, safeName);
  if (fs.existsSync(bundledPath)) return bundledPath;

  // 3. Check process.cwd() uploads directory (Vercel lambda bundle root)
  const cwdPath = path.join(process.cwd(), 'uploads', safeName);
  if (fs.existsSync(cwdPath)) return cwdPath;

  return writablePath;
}

// Multer setup using writable directory (/tmp on Vercel)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, writableUploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});
const upload = multer({ storage });

// Stripe Webhook Endpoint (Requires raw JSON buffer for signature verification)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const result = await billingService.handleWebhook(req.body, sig);
    res.json(result);
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.set('view engine', 'ejs');
const viewsDir = fs.existsSync(path.join(__dirname, 'views'))
  ? path.join(__dirname, 'views')
  : path.join(process.cwd(), 'views');
app.set('views', viewsDir);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// Gracefully handle browser favicon requests
app.get(['/favicon.ico', '/favicon.png'], (req, res) => res.status(204).end());

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
  const datasetPath = fs.existsSync(path.join(__dirname, 'data', 'gpt_dataset.csv'))
    ? path.join(__dirname, 'data', 'gpt_dataset.csv')
    : path.join(process.cwd(), 'data', 'gpt_dataset.csv');

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

let CachedPDFParse = null;
async function getPDFParseClass() {
  if (!CachedPDFParse) {
    const mod = await import('pdf-parse');
    CachedPDFParse = mod.PDFParse || mod.default?.PDFParse || mod.default;
  }
  return CachedPDFParse;
}

async function parsePdfDetails(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const PDFParser = await getPDFParseClass();
    const parser = new PDFParser(new Uint8Array(fileBuffer));
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
  const csvFile = isServerless ? path.join(os.tmpdir(), 'cv_sections.csv') : path.join(__dirname, 'cv_sections.csv');
  try {
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
  } catch (err) {
    console.warn('Notice: Could not write to cv_sections.csv on serverless filesystem:', err.message);
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

// 1. API: Parse uploaded PDF resume (Protected by subscription & quota check)
app.post('/api/parse-resume', checkSubscriptionAndQuota, upload.single('resume'), async (req, res) => {
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

    // Consume scan quota for free users upon successful parse
    if (req.consumeScanQuota) req.consumeScanQuota();

    // Persist to relational database
    const currentMonth = new Date().toISOString().slice(0, 7);
    const updatedUsage = db.userUsage.getMonthlyUsage(req.user.id, currentMonth);

    const savedResume = db.resumes.create({
      userId: req.user.id,
      title: req.file.originalname.replace(/\.pdf$/i, ''),
      filename: req.file.originalname,
      fileSizeBytes: req.file.size,
      pageCount: analysis.pages || 1,
      rawText: analysis.rawText,
      cleanedText: analysis.cleanedText,
      parsedSections: analysis.sections,
      detectedCategory: analysis.category
    });

    if (analysis.match) {
      db.evaluations.create({
        userId: req.user.id,
        resumeId: savedResume.id,
        targetJobTitle: analysis.match.targetJob || jobKeywords || 'Custom Job Requirement',
        similarityScore: analysis.match.similarityScore,
        matchRating: analysis.match.matchRating,
        dimensions: analysis.match.dimensions || [],
        keywordGaps: analysis.match.keywordAlignment || []
      });
    }

    return res.json({
      success: true,
      ...analysis,
      resumeId: savedResume.id,
      billing: {
        isPro: req.isPro,
        planTier: req.subscription?.planTier || 'free',
        scansUsed: updatedUsage.scansUsed,
        maxFreeScans: updatedUsage.maxFreeScans,
        scansRemaining: req.isPro ? 'unlimited' : Math.max(0, updatedUsage.maxFreeScans - updatedUsage.scansUsed)
      }
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
    const samplesMap = new Map();

    const scanDir = (dir) => {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          files.filter(f => f.toLowerCase().endsWith('.pdf')).forEach(filename => {
            if (!samplesMap.has(filename)) {
              const filePath = path.join(dir, filename);
              const stat = fs.statSync(filePath);
              samplesMap.set(filename, {
                filename,
                displayName: filename.replace(/^\d+_/, '').replace(/\.pdf$/i, '').replace(/_/g, ' '),
                sizeBytes: stat.size,
                sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`
              });
            }
          });
        } catch (e) {
          console.warn('Directory scan notice for', dir, e.message);
        }
      }
    };

    scanDir(bundledUploadsDir);
    if (writableUploadsDir !== bundledUploadsDir) {
      scanDir(writableUploadsDir);
    }
    const cwdUploads = path.join(process.cwd(), 'uploads');
    if (cwdUploads !== bundledUploadsDir && cwdUploads !== writableUploadsDir) {
      scanDir(cwdUploads);
    }

    return res.json({ success: true, samples: Array.from(samplesMap.values()) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. API: Parse an existing sample resume (Protected by subscription & quota check)
app.post('/api/parse-sample', checkSubscriptionAndQuota, async (req, res) => {
  try {
    const { sampleName, job_description_text, job_keywords } = req.body;
    if (!sampleName) {
      return res.status(400).json({ success: false, error: 'sampleName is required.' });
    }

    const safeSampleName = path.basename(sampleName);
    const targetPath = resolveResumePath(safeSampleName);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, error: 'Sample file not found: ' + safeSampleName });
    }

    const analysis = await analyzeResumePdf(targetPath, safeSampleName, job_description_text || '', job_keywords || '');

    // Consume scan quota for free users
    if (req.consumeScanQuota) req.consumeScanQuota();

    const currentMonth = new Date().toISOString().slice(0, 7);
    const updatedUsage = db.userUsage.getMonthlyUsage(req.user.id, currentMonth);

    return res.json({
      success: true,
      ...analysis,
      billing: {
        isPro: req.isPro,
        planTier: req.subscription?.planTier || 'free',
        scansUsed: updatedUsage.scansUsed,
        maxFreeScans: updatedUsage.maxFreeScans,
        scansRemaining: req.isPro ? 'unlimited' : Math.max(0, updatedUsage.maxFreeScans - updatedUsage.scansUsed)
      }
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
    const tmpCsv = path.join(os.tmpdir(), 'cv_sections.csv');
    const localCsv = path.join(__dirname, 'cv_sections.csv');
    const targetCsv = fs.existsSync(tmpCsv) ? tmpCsv : (fs.existsSync(localCsv) ? localCsv : null);

    if (!targetCsv) {
      return res.json({ success: true, records: [], count: 0 });
    }
    const content = fs.readFileSync(targetCsv, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      records.push(lines[i]);
    }
    return res.json({ success: true, count: records.length, records });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5b. API: Fetch Job Listings (JobDataLake API Integration & Match Scoring)
const handleJobsRequest = async (req, res) => {
  try {
    const query = req.body?.query || req.query?.query || '';
    const category = req.body?.category || req.query?.category || '';
    const remote = req.body?.remote !== undefined ? req.body.remote : (req.query?.remote === 'true' || req.query?.remote === true);
    const resumeText = req.body?.resumeText || req.query?.resumeText || '';

    const result = await jobsService.getJobs({
      query,
      category,
      remoteOnly: remote === 'true' || remote === true,
      resumeText,
      computeTfidfVector,
      rateResumeSimilarity
    });
    return res.json(result);
  } catch (err) {
    console.error('API /api/jobs error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
app.get('/api/jobs', handleJobsRequest);
app.post('/api/jobs', handleJobsRequest);

// 6. API: Create Stripe Checkout Session ($5/mo or $39/yr)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_demo_001';
    const { plan } = req.body || {}; // 'monthly' | 'annual'
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const hostUrl = `${protocol}://${host}`;

    const result = await billingService.createCheckoutSession(userId, plan || 'monthly', hostUrl);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Create checkout session error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. API: Customer Portal Session for Managing Subscriptions
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_demo_001';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const returnUrl = `${protocol}://${host}`;

    const result = await billingService.createPortalSession(userId, returnUrl);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. API: Subscription & Monthly Quota Status
app.get('/api/subscription-status', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_demo_001';
    const sub = db.subscriptions.findActiveByUserId(userId);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = db.userUsage.getMonthlyUsage(userId, currentMonth);

    res.json({
      success: true,
      userId,
      isPro: !!sub,
      planTier: sub?.planTier || 'free',
      status: sub?.status || 'inactive',
      currentPeriodEnd: sub?.currentPeriodEnd || null,
      scansUsed: usage.scansUsed,
      maxFreeScans: usage.maxFreeScans,
      scansRemaining: sub ? 'unlimited' : Math.max(0, usage.maxFreeScans - usage.scansUsed)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. API: Dev/Test Toggle Pro status
app.post('/api/test/toggle-pro', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_demo_001';
    const sub = db.subscriptions.findActiveByUserId(userId);
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    if (sub) {
      db.subscriptions.upsert({
        userId,
        stripeCustomerId: `cus_demo_${userId}`,
        status: 'inactive',
        planTier: 'free',
        currentPeriodEnd: null
      });
      res.json({ success: true, isPro: false, message: 'Switched to Free tier (3 scans/month quota applies).' });
    } else {
      db.subscriptions.upsert({
        userId,
        stripeCustomerId: `cus_demo_${userId}`,
        status: 'active',
        planTier: 'pro_monthly',
        currentPeriodEnd: oneMonthFromNow.toISOString()
      });
      res.json({ success: true, isPro: true, message: 'Activated Pro tier subscription ($5/month simulated).' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. API: Dev/Test Reset monthly quota count
app.post('/api/test/reset-quota', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_demo_001';
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = db.userUsage.setScansUsed(userId, 0, currentMonth);
    res.json({ success: true, usage, message: 'Monthly scan count reset to 0/3.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. API: Dev/Test Simulate hitting free scan limit (sets scansUsed to 3)
app.post('/api/test/simulate-limit-reached', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_demo_001';
    const currentMonth = new Date().toISOString().slice(0, 7);
    db.subscriptions.upsert({
      userId,
      stripeCustomerId: `cus_demo_${userId}`,
      status: 'inactive',
      planTier: 'free',
      currentPeriodEnd: null
    });
    const usage = db.userUsage.setScansUsed(userId, 3, currentMonth);
    res.json({ success: true, usage, isPro: false, message: 'Simulated 3/3 scans used. Next scan will trigger HTTP 403 upgrade paywall.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. API: Dev/Test Simulate Stripe Webhook Event
app.post('/api/test/simulate-webhook', async (req, res) => {
  try {
    const { eventType, userId = 'usr_demo_001', plan = 'monthly' } = req.body || {};
    let mockPayload;

    if (eventType === 'checkout.session.completed') {
      mockPayload = {
        id: `evt_sim_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: userId,
            customer: `cus_sim_${userId}`,
            subscription: `sub_sim_${Date.now()}`,
            metadata: { userId, planType: plan }
          }
        }
      };
    } else if (eventType === 'customer.subscription.deleted') {
      const sub = db.subscriptions.findByUserId(userId);
      mockPayload = {
        id: `evt_sim_${Date.now()}`,
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: sub?.stripeCustomerId || `cus_sim_${userId}`
          }
        }
      };
    } else if (eventType === 'invoice.payment_failed') {
      const sub = db.subscriptions.findByUserId(userId);
      mockPayload = {
        id: `evt_sim_${Date.now()}`,
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: sub?.stripeCustomerId || `cus_sim_${userId}`
          }
        }
      };
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported simulation eventType: ' + eventType });
    }

    const result = await billingService.handleWebhook(mockPayload, null);
    res.json({ success: true, simulatedEvent: mockPayload.type, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Routes
app.get('/', (req, res) => {
  const userId = req.headers['x-user-id'] || 'usr_demo_001';
  const sub = db.subscriptions.findActiveByUserId(userId);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usage = db.userUsage.getMonthlyUsage(userId, currentMonth);

  res.render('index', {
    error: null,
    prediction_category: null,
    resume_match_rating: null,
    numerical_similarity_score: null,
    csv_data: null,
    billing: {
      isPro: !!sub,
      planTier: sub?.planTier || 'free',
      scansUsed: usage.scansUsed,
      maxFreeScans: usage.maxFreeScans,
      scansRemaining: sub ? 'unlimited' : Math.max(0, usage.maxFreeScans - usage.scansUsed)
    }
  });
});

app.post('/upload', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'job_description', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_demo_001';
    let user = db.users.find(userId);
    if (!user) {
      user = db.users.create({ id: userId, email: 'candidate@example.com', name: 'Demo Candidate' });
    }
    const sub = db.subscriptions.findActiveByUserId(userId);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = db.userUsage.getMonthlyUsage(userId, currentMonth);

    // Enforce 403 status code if on free tier and scan limit reached
    if (!sub && usage.scansUsed >= usage.maxFreeScans) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({
          success: false,
          error: `Monthly free scan limit reached (${usage.scansUsed}/${usage.maxFreeScans}).`,
          requiresUpgrade: true,
          upgradeUrl: '/#pricing',
          redirectUrl: '/#pricing',
          checkoutApi: '/api/create-checkout-session',
          scansUsed: usage.scansUsed,
          maxFreeScans: usage.maxFreeScans,
          message: 'Upgrade to Pro ($5/month) for unlimited ATS scans, multi-engine simulations, and Recharts gap analysis.'
        });
      }
      return res.status(403).render('index', {
        error: `Monthly free scan limit reached (${usage.scansUsed}/${usage.maxFreeScans}). Upgrade to Pro ($5/mo) for unlimited scans.`,
        prediction_category: null,
        resume_match_rating: null,
        numerical_similarity_score: null,
        csv_data: null,
        limit_reached: true,
        redirectUrl: '/#pricing',
        billing: {
          isPro: false,
          planTier: 'free',
          scansUsed: usage.scansUsed,
          maxFreeScans: usage.maxFreeScans,
          scansRemaining: 0
        }
      });
    }

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
        csv_data: null,
        billing: {
          isPro: !!sub,
          planTier: sub?.planTier || 'free',
          scansUsed: usage.scansUsed,
          maxFreeScans: usage.maxFreeScans,
          scansRemaining: sub ? 'unlimited' : Math.max(0, usage.maxFreeScans - usage.scansUsed)
        }
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

    // Consume scan quota for free user
    if (!sub) {
      db.userUsage.incrementScan(userId, currentMonth);
    }
    const updatedUsage = db.userUsage.getMonthlyUsage(userId, currentMonth);

    // Persist to database
    const savedResume = db.resumes.create({
      userId,
      title: name.replace(/\.pdf$/i, ''),
      filename: name,
      fileSizeBytes: resumeFile.size,
      pageCount: 1,
      rawText: resumeText,
      cleanedText: cleanedResume,
      parsedSections: resumeSections,
      detectedCategory: predictionId
    });

    db.evaluations.create({
      userId,
      resumeId: savedResume.id,
      targetJobTitle: jobKeywords || 'Evaluated Job',
      similarityScore: roundedSimilarityScore,
      matchRating,
      dimensions: [],
      keywordGaps: []
    });

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
      csv_data: csvDataForTemplate,
      billing: {
        isPro: !!sub,
        planTier: sub?.planTier || 'free',
        scansUsed: updatedUsage.scansUsed,
        maxFreeScans: updatedUsage.maxFreeScans,
        scansRemaining: sub ? 'unlimited' : Math.max(0, updatedUsage.maxFreeScans - updatedUsage.scansUsed)
      }
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

// Listen on port only when run directly (not under Vercel serverless functions)
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Resume Rater app listening on http://0.0.0.0:${PORT}`);
  });
}

export { app };
export default app;
