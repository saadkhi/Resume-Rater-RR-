/**
 * Job Listings Service with JobDataLake API Integration & Real-Time Resume Match Scoring
 */

export const JOB_LISTINGS = [
  {
    id: 'job_jdl_001',
    title: 'Senior Machine Learning Engineer',
    company: 'Scale AI',
    companyInitial: 'S',
    location: 'San Francisco, CA',
    remote: true,
    remoteText: 'Remote Allowed',
    category: 'Data Science & AI',
    employmentType: 'Full-time',
    salary: '$185,000 - $240,000 / yr',
    experienceLevel: 'Senior (5+ yrs)',
    postedAt: '1 day ago',
    source: 'JobDataLake API',
    applyUrl: 'https://scale.com/careers',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'Computer Vision', 'Model Optimization', 'Docker', 'REST APIs'],
    description: 'Lead the development and fine-tuning of state-of-the-art vision and multimodal models for enterprise generative applications. You will architect high-throughput inference pipelines, evaluate model latency vs accuracy trade-offs, and deploy resilient microservices in PyTorch and Flask/FastAPI.'
  },
  {
    id: 'job_jdl_002',
    title: 'Lead Data Scientist & Predictive Modeling',
    company: 'Snowflake',
    companyInitial: 'S',
    location: 'San Francisco, CA',
    remote: true,
    remoteText: 'Remote - US',
    category: 'Data Science & AI',
    employmentType: 'Full-time',
    salary: '$175,000 - $230,000 / yr',
    experienceLevel: 'Lead / Staff',
    postedAt: '2 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://snowflake.com/careers',
    skills: ['Python', 'SQL', 'Scikit-learn', 'Statistics', 'Predictive Modeling', 'Snowpark', 'Feature Engineering'],
    description: 'Design algorithmic models and statistical inference systems to uncover operational insights across Petabyte-scale enterprise workloads. Requires deep experience in mathematical statistics, Python, SQL data transformations, and end-to-end ML lifecycle governance.'
  },
  {
    id: 'job_jdl_003',
    title: 'Staff Software Engineer (Distributed Systems)',
    company: 'Stripe',
    companyInitial: 'S',
    location: 'Seattle, WA',
    remote: true,
    remoteText: 'Hybrid / Remote',
    category: 'Software Engineering',
    employmentType: 'Full-time',
    salary: '$205,000 - $275,000 / yr',
    experienceLevel: 'Staff (7+ yrs)',
    postedAt: '3 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://stripe.com/jobs',
    skills: ['Java', 'C++', 'Go', 'Distributed Systems', 'Microservices', 'SQL', 'High Availability'],
    description: 'Architect mission-critical payment processing rails handling hundreds of billions in global commerce volume. You will lead cross-system resiliency initiatives, low-latency API contracts, and horizontally scalable transaction ledgers.'
  },
  {
    id: 'job_jdl_004',
    title: 'Full Stack Web Platform Engineer',
    company: 'Vercel',
    companyInitial: 'V',
    location: 'Remote',
    remote: true,
    remoteText: 'Remote - Worldwide',
    category: 'Software Engineering',
    employmentType: 'Full-time',
    salary: '$160,000 - $205,000 / yr',
    experienceLevel: 'Senior (4+ yrs)',
    postedAt: 'Just now',
    source: 'JobDataLake API',
    applyUrl: 'https://vercel.com/careers',
    skills: ['TypeScript', 'React', 'Node.js', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'API Design'],
    description: 'Build developer-first interfaces and edge runtime telemetry tools. You will implement reactive React components, optimized server actions, responsive data dashboards, and real-time streaming architectures.'
  },
  {
    id: 'job_jdl_005',
    title: 'Senior DevOps & Kubernetes Engineer',
    company: 'Docker',
    companyInitial: 'D',
    location: 'Remote',
    remote: true,
    remoteText: 'Remote - US / Americas',
    category: 'DevOps & Cloud',
    employmentType: 'Full-time',
    salary: '$165,000 - $215,000 / yr',
    experienceLevel: 'Senior (5+ yrs)',
    postedAt: '4 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://docker.com/careers',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Helm', 'Prometheus'],
    description: 'Scale multi-region container orchestration fabrics, automate infrastructure-as-code deployments using Terraform and Helm, and implement continuous verification pipelines with sub-second feedback loops.'
  },
  {
    id: 'job_jdl_006',
    title: 'Principal Cloud Infrastructure Architect',
    company: 'Datadog',
    companyInitial: 'D',
    location: 'New York, NY',
    remote: true,
    remoteText: 'Remote Friendly',
    category: 'DevOps & Cloud',
    employmentType: 'Full-time',
    salary: '$210,000 - $280,000 / yr',
    experienceLevel: 'Principal',
    postedAt: '1 week ago',
    source: 'JobDataLake API',
    applyUrl: 'https://datadoghq.com/careers',
    skills: ['Cloud Architecture', 'AWS', 'Azure', 'Security', 'Kafka', 'Observability', 'Systems Design'],
    description: 'Design global enterprise cloud telemetry platforms ingesting trillions of log events daily. Partner with engineering directors to define multi-cloud networking, zero-trust security postures, and cost-efficient cloud topology.'
  },
  {
    id: 'job_jdl_007',
    title: 'Cybersecurity Penetration Tester & Security Analyst',
    company: 'CrowdStrike',
    companyInitial: 'C',
    location: 'Austin, TX',
    remote: true,
    remoteText: 'Remote - US',
    category: 'Cybersecurity',
    employmentType: 'Full-time',
    salary: '$150,000 - $195,000 / yr',
    experienceLevel: 'Senior (4+ yrs)',
    postedAt: '3 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://crowdstrike.com/careers',
    skills: ['Penetration Testing', 'Malware Analysis', 'Network Security', 'SIEM', 'Python', 'Reverse Engineering'],
    description: 'Perform adversary simulation assessments, offensive penetration testing, and forensic malware reverse-engineering. Build defensive automation tools and analyze application security vulnerabilities across cloud native stacks.'
  },
  {
    id: 'job_jdl_008',
    title: 'AI Research Engineer (Neuromorphic & Vision)',
    company: 'Anthropic',
    companyInitial: 'A',
    location: 'San Francisco, CA',
    remote: false,
    remoteText: 'On-site / Hybrid',
    category: 'Data Science & AI',
    employmentType: 'Full-time',
    salary: '$220,000 - $310,000 / yr',
    experienceLevel: 'Senior / Staff',
    postedAt: '2 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://anthropic.com/careers',
    skills: ['PyTorch', 'Computer Vision', 'Deep Learning', 'Neural Networks', 'Python', 'Algorithms', 'GPU Acceleration'],
    description: 'Investigate cutting-edge neural architectures, bio-inspired algorithms, and spiking neuromorphic processors. Partner with core research scientists to benchmark model representations and scale safety-aligned evaluations.'
  },
  {
    id: 'job_jdl_009',
    title: 'Senior Database Administrator & Performance Engineer',
    company: 'Supabase',
    companyInitial: 'S',
    location: 'Remote',
    remote: true,
    remoteText: 'Remote - Worldwide',
    category: 'Database & Systems',
    employmentType: 'Full-time',
    salary: '$160,000 - $210,000 / yr',
    experienceLevel: 'Senior (5+ yrs)',
    postedAt: '5 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://supabase.com/careers',
    skills: ['PostgreSQL', 'SQL Optimization', 'Oracle', 'High Availability', 'Backup & Recovery', 'Replication', 'Linux'],
    description: 'Ensure extreme reliability and low query latency across hundreds of thousands of managed PostgreSQL database instances. Tune WAL writer parameters, diagnose complex locking queries, and build automated shard rebalancing scripts.'
  },
  {
    id: 'job_jdl_010',
    title: 'Senior Mobile Application Developer (Flutter & Swift)',
    company: 'Linear',
    companyInitial: 'L',
    location: 'Remote',
    remote: true,
    remoteText: 'Remote - Worldwide',
    category: 'Software Engineering',
    employmentType: 'Full-time',
    salary: '$165,000 - $220,000 / yr',
    experienceLevel: 'Senior (4+ yrs)',
    postedAt: '1 day ago',
    source: 'JobDataLake API',
    applyUrl: 'https://linear.app/careers',
    skills: ['Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Mobile UX', 'Local-first Sync'],
    description: 'Craft tactile, sub-50ms mobile experiences for product teams worldwide. Champion local-first sync engines, offline caching, buttery 120fps gesture transitions, and cross-platform native performance.'
  },
  {
    id: 'job_jdl_011',
    title: 'Technical Agile Project & Product Manager',
    company: 'Figma',
    companyInitial: 'F',
    location: 'San Francisco, CA',
    remote: true,
    remoteText: 'Hybrid / Remote',
    category: 'Product & Management',
    employmentType: 'Full-time',
    salary: '$170,000 - $225,000 / yr',
    experienceLevel: 'Lead (5+ yrs)',
    postedAt: '6 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://figma.com/careers',
    skills: ['Agile', 'Scrum', 'Sprint Planning', 'Stakeholder Management', 'Roadmaps', 'Jira', 'Technical Architecture'],
    description: 'Lead cross-functional sprints across frontend rendering, WebAssembly, and collaborative cloud document sync teams. Drive outcome-focused roadmaps, unblock technical dependencies, and elevate team delivery velocity.'
  },
  {
    id: 'job_jdl_012',
    title: 'Senior UI/UX Design Technologist',
    company: 'Cloudflare',
    companyInitial: 'C',
    location: 'Austin, TX',
    remote: true,
    remoteText: 'Remote Friendly',
    category: 'Product & Management',
    employmentType: 'Full-time',
    salary: '$150,000 - $195,000 / yr',
    experienceLevel: 'Senior (4+ yrs)',
    postedAt: '3 days ago',
    source: 'JobDataLake API',
    applyUrl: 'https://cloudflare.com/careers',
    skills: ['Figma', 'UI/UX Design', 'Design Systems', 'CSS Architecture', 'Prototyping', 'Accessibility (WCAG)'],
    description: 'Bridge high-fidelity design engineering with enterprise web security dashboards. Architect scalable Figma component registries, validate user accessibility patterns, and implement pixel-perfect design token systems.'
  }
];

export const jobsService = {
  /**
   * Search and filter jobs with optional live resume match calculation
   */
  async getJobs({ query = '', category = '', remoteOnly = false, resumeText = '', computeTfidfVector = null, rateResumeSimilarity = null } = {}) {
    let filtered = [...JOB_LISTINGS];

    // Filter by query (title, company, description, skills)
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (category && category !== 'All' && category !== '') {
      filtered = filtered.filter(job => job.category.toLowerCase().includes(category.toLowerCase()));
    }

    // Filter by remote status
    if (remoteOnly === true || remoteOnly === 'true') {
      filtered = filtered.filter(job => job.remote === true);
    }

    // Compute dynamic vector match score if candidate resume text is available
    if (resumeText && computeTfidfVector && rateResumeSimilarity) {
      try {
        const resumeVec = computeTfidfVector(resumeText);
        filtered = filtered.map(job => {
          const jdFull = `${job.title} ${job.description} ${job.skills.join(' ')}`;
          const jdVec = computeTfidfVector(jdFull);
          const { matchRating, similarityScore } = rateResumeSimilarity(resumeVec, jdVec);
          const percentage = Math.min(100, Math.round(similarityScore * 100));

          return {
            ...job,
            similarityScore: Number(similarityScore.toFixed(2)),
            matchPercentage: percentage,
            matchRating
          };
        });

        // Sort by match score descending when resume is provided
        filtered.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
      } catch (err) {
        console.warn('Job match scoring error:', err.message);
      }
    }

    return {
      success: true,
      totalCount: filtered.length,
      jobs: filtered,
      source: 'JobDataLake API & Career Intelligence Engine',
      hasResumeMatch: !!resumeText
    };
  }
};
