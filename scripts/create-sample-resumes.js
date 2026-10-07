import fs from 'fs';
import path from 'path';

function createPdfBuffer(pages) {
  // pages is array of arrays of text lines
  let out = '%PDF-1.4\n';
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(out));
    out += str + '\n';
  }

  // 1: Catalog
  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // Page kids
  const pageObjIds = [];
  let currentObjId = 3;

  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(currentObjId);
    currentObjId += 2; // page and content stream
  }

  // 2: Pages
  addObj(`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map(id => id + ' 0 R').join(' ')}] /Count ${pages.length} >>\nendobj`);

  const fontObjId = currentObjId;

  // Add pages and content streams
  for (let i = 0; i < pages.length; i++) {
    const pId = pageObjIds[i];
    const cId = pId + 1;
    const lines = pages[i];

    const streamLines = lines.map((line, lineIdx) => {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      const y = 750 - lineIdx * 16;
      return `BT /F1 11 Tf 50 ${y} Td (${escaped}) Tj ET`;
    });
    const streamContent = streamLines.join('\n');
    const streamLen = Buffer.byteLength(streamContent);

    addObj(`${pId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${cId} 0 R /Resources << /Font << /F1 ${fontObjId} 0 R >> >> >>\nendobj`);
    addObj(`${cId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`);
  }

  // Font object
  addObj(`${fontObjId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  const totalObjs = fontObjId;
  const xrefOffset = Buffer.byteLength(out);
  out += `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    out += off.toString().padStart(10, '0') + ' 00000 n \n';
  }
  out += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, 'utf8');
}

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Saads_CV_Resume.pdf
const saadResumeLines = [
  'Saad Ali',
  'saadatherali1256@gmail.com | 0335-3948753 | Karachi, Pakistan | github.com/saadali05',
  '',
  'SUMMARY',
  'Software Engineer and Machine Learning Developer with strong expertise in Python, PyTorch,',
  'Flask, Django, NLP, Computer Vision, and full-stack web systems architecture.',
  '',
  'EDUCATION',
  'Usman Institute of Technology - Bachelor of Science in Software Engineering (2021 - 2025)',
  'Govt. Degree Boys College Johar - Intermediate Pre-Engineering (2019 - 2021)',
  'The Educator School - Matriculation Computer Science (2006 - 2019)',
  '',
  'SKILLS',
  'Languages: Python, JavaScript, SQL, C++, HTML, CSS',
  'Frameworks: Django, Flask, PyTorch, Scikit-learn, OpenCV, React, Node.js',
  'Tools: Git, Docker, Figma, Canva, Photoshop, MySQL, PostgreSQL, Linux',
  'Core Competencies: Machine Learning, NLP, Computer Vision, TF-IDF, Vector Search, Algorithms',
  '',
  'EXPERIENCE',
  'Machine Learning & Software Developer Intern - Tech Solutions (2023 - 2024)',
  '- Designed and deployed predictive AI classification models and automated attendance pipelines.',
  '- Built microservices integrating OpenCV and K-Nearest Neighbors for sub-second recognition.',
  '- Developed REST API endpoints and database synchronization routines with Flask and MySQL.',
  '',
  'PROJECTS',
  'Resume Rater (RR): ATS scoring engine evaluating resumes against job descriptions with TF-IDF.',
  'FaceTrack Attendance System: Flask and OpenCV facial recognition attendance system.',
  'Emotion Entertainment (EmoEnt): Machine Learning and NLP app analyzing emotional tone from text.',
  'Learning Management System: Web-based educational platform with Django and relational DB.',
  'Boiler Management System: Automated remote boiler monitoring and telemetry pipeline.'
];
fs.writeFileSync(path.join(uploadsDir, 'Saads_CV_Resume.pdf'), createPdfBuffer([saadResumeLines]));

// 2. resume1.pdf
const resume1Lines = [
  'Alex Johnson',
  'alex.johnson@example.com | (555) 234-5678 | San Francisco, CA | linkedin.com/in/alexjohnson-ml',
  '',
  'SUMMARY',
  'Lead Machine Learning Engineer with 6+ years designing large-scale NLP, PyTorch transformers,',
  'multimodal perception systems, and distributed model inference services in cloud environments.',
  '',
  'EDUCATION',
  'Stanford University - Bachelor of Science in Computer Science (2016 - 2020)',
  'Focus: Artificial Intelligence, Deep Learning, and Mathematical Statistics',
  '',
  'SKILLS',
  'Technical Skills: Python, PyTorch, TensorFlow, Scikit-learn, Transformers, CUDA, HuggingFace',
  'Systems: Docker, Kubernetes, AWS, FastAPI, Ray, Vector Databases, PostgreSQL, Git',
  'Specializations: Natural Language Processing, Model Optimization, RLHF, Embeddings, MLOps',
  '',
  'EXPERIENCE',
  'Staff Machine Learning Engineer - Scale AI (2022 - Present)',
  '- Led fine-tuning and deployment of vision and language foundation models for enterprise workloads.',
  '- Architected high-throughput inference microservices reducing p99 latency by 45%.',
  '- Built automated continuous evaluation harnesses measuring vector alignment and model safety.',
  'Senior Machine Learning Engineer - Databricks (2020 - 2022)',
  '- Scaled distributed PyTorch training jobs over multi-node GPU clusters with Ray and Spark.',
  '- Implemented feature store transformations and automated ETL pipelines for petabyte datasets.',
  '',
  'PROJECTS',
  'LLM Alignment & Evaluation Engine: Open-source preference optimization harness for frontier LLMs.',
  'Real-Time Multimodal Search: Semantic vector similarity search engine indexing 50M+ items.'
];
fs.writeFileSync(path.join(uploadsDir, 'resume1.pdf'), createPdfBuffer([resume1Lines]));

// 3. resume2.pdf
const resume2Lines = [
  'Morgan Chen',
  'morgan.chen@example.com | (555) 876-5432 | Seattle, WA | github.com/morganchen-dev',
  '',
  'SUMMARY',
  'Principal Full Stack & Distributed Systems Software Engineer with expertise in TypeScript,',
  'React, Node.js, Next.js, PostgreSQL, Go, and high-availability cloud architecture.',
  '',
  'EDUCATION',
  'University of Washington - Bachelor of Science in Software Engineering (2017 - 2021)',
  '',
  'SKILLS',
  'Languages: TypeScript, JavaScript, Go, Python, SQL, HTML5, CSS3',
  'Frontend: React, Next.js, Tailwind CSS, Recharts, Redux Toolkit, WebGL',
  'Backend & Data: Node.js, Express, PostgreSQL, Redis, GraphQL, REST APIs, Kafka',
  'Infrastructure: AWS, Docker, Kubernetes, Terraform, CI/CD, Linux Systems',
  '',
  'EXPERIENCE',
  'Senior Software Engineer - Stripe (2022 - Present)',
  '- Built reactive developer dashboards and real-time streaming transaction visualization tools.',
  '- Engineered distributed idempotent API contracts handling high concurrency and throughput.',
  '- Championed component accessibility standards and end-to-end performance budgets.',
  'Full Stack Software Engineer - Vercel (2021 - 2022)',
  '- Developed edge runtime features and developer telemetry dashboards in Next.js and TypeScript.',
  '',
  'PROJECTS',
  'Live Analytics Platform: Distributed real-time metrics visualizer using React, WebSockets, and Redis.',
  'Multi-Cloud Secret Federation: Zero-trust secrets manager and CLI tool built in Go.'
];
fs.writeFileSync(path.join(uploadsDir, 'resume2.pdf'), createPdfBuffer([resume2Lines]));

// 4. Saad_Ali_ResumeCV_Old.pdf
const saadOldResumeLines = [
  'Saad Ali',
  'saadatherali1256@gmail.com | Karachi, Pakistan',
  '',
  'EDUCATION',
  'Usman Institute of Technology - BS Software Engineering (2021 - 2025)',
  'Govt. Degree Boys College Johar - Pre-Engineering (2019 - 2021)',
  '',
  'SKILLS',
  'Python, Django, Flask, MySQL, JavaScript, HTML, CSS, Figma',
  '',
  'EXPERIENCE',
  'Junior Web Developer Intern (2022 - 2023)',
  '- Created responsive web interfaces and integrated backend APIs in Python and Django.',
  '- Designed relational database tables in MySQL and automated backup procedures.',
  '',
  'PROJECTS',
  'Learning Management System: Online educational course platform developed with Django.',
  'Boiler Management System: Automated IoT reporting system for industrial boilers.',
  'Resume Rater: Web application to calculate resume job description match percentage.'
];
fs.writeFileSync(path.join(uploadsDir, 'Saad_Ali_ResumeCV_Old.pdf'), createPdfBuffer([saadOldResumeLines]));

console.log('Successfully generated all 4 bundled sample resume PDFs in /uploads!');
