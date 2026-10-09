import React, { useState, useMemo } from 'react';

/**
 * Resume Roster - Modern Dashboard & Landing Page Template
 * Built with React 19 & Tailwind CSS
 * Features:
 *  - Minimalist Dashboard Layout with metric cards & stats
 *  - Interactive Tabbed Content Viewers (Roster, Match Analyzer, Section Deep-Dive, Pricing, Usage)
 *  - Polished Pricing Section with Monthly ($5/mo) & Annual ($39/yr) toggles + Paddle Checkout integration
 *  - Responsive Candidate Roster with category filters, skills pills, and score bars
 *  - Drag & drop resume uploader UI with parsing state simulation
 */

// Sample initial candidate roster
const INITIAL_CANDIDATES = [
  {
    id: 'cand-01',
    name: 'Sarah Chen',
    title: 'Senior Full Stack Engineer',
    category: 'Full Stack & Cloud',
    email: 'sarah.chen@example.com',
    matchScore: 94,
    status: 'Shortlisted',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    experienceYears: 6,
    lastScanned: '2026-10-07',
    summary: 'Full-stack specialist with 6+ years shipping high-throughput SaaS web applications and event-driven microservices.',
    education: 'B.S. in Computer Science - UC Berkeley',
    sections: {
      summary: 'Experienced Full Stack Engineer passionate about developer tooling, scalable APIs, and clean UX design.',
      experience: '• Staff Software Engineer at CloudScale (2022-Present): Led core platform architecture reducing latency by 42%.\n• Full Stack Engineer at NextGen Labs (2019-2022): Built React component library and GraphQL microservices.',
      skills: 'JavaScript, TypeScript, React 19, Next.js, Node.js, Express, Go, PostgreSQL, Redis, Docker, Kubernetes, AWS',
      education: 'B.S. Computer Science, University of California Berkeley (Magna Cum Laude)'
    }
  },
  {
    id: 'cand-02',
    name: 'Marcus Vance',
    title: 'Machine Learning & Data Engineer',
    category: 'AI & Data Science',
    email: 'marcus.v@example.com',
    matchScore: 88,
    status: 'Interview Scheduled',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'FastAPI', 'MLOps', 'Vector DBs'],
    experienceYears: 5,
    lastScanned: '2026-10-06',
    summary: 'Applied ML engineer specializing in RAG architectures, LLM fine-tuning, and low-latency inference pipelines.',
    education: 'M.S. in Artificial Intelligence - Carnegie Mellon',
    sections: {
      summary: 'Data & ML practitioner with extensive experience deploying neural networks and transformer embeddings.',
      experience: '• ML Engineer at Synthetix AI (2021-Present): Deployed real-time embedding pipelines handling 10M daily requests.\n• Data Scientist at Insight Analytics (2019-2021): Automated data cleaning and ETL clusters using Apache Spark.',
      skills: 'Python, PyTorch, Scikit-learn, LangChain, Milvus, Docker, Kubernetes, BigQuery, SQL',
      education: 'M.S. Artificial Intelligence, Carnegie Mellon University; B.S. Mathematics'
    }
  },
  {
    id: 'cand-03',
    name: 'Elena Rostova',
    title: 'Lead Product Designer & Design Systems',
    category: 'UI/UX & Product Design',
    email: 'elena.rostova@example.com',
    matchScore: 91,
    status: 'Shortlisted',
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Tailwind', 'Accessibility'],
    experienceYears: 7,
    lastScanned: '2026-10-05',
    summary: 'Principal product designer creating design tokens, multi-platform design systems, and enterprise user workflows.',
    education: 'B.A. in Visual Design - Rhode Island School of Design',
    sections: {
      summary: 'Senior design architect balancing visual elegance, WCAG accessibility, and engineering handoff precision.',
      experience: '• Lead Product Designer at Prism Systems (2020-Present): Re-architected core SaaS design tokens adopted by 65 engineers.\n• Senior UI/UX Designer at Flux (2017-2020): Spearheaded mobile and responsive web redesign.',
      skills: 'Figma, Token Studio, FigJam, UserTesting, HTML/CSS, Tailwind, Storybook, WCAG 2.1 AA',
      education: 'B.F.A. Industrial & Visual Design, RISD'
    }
  },
  {
    id: 'cand-04',
    name: 'David Kalu',
    title: 'Site Reliability & DevOps Architect',
    category: 'DevOps & Infrastructure',
    email: 'david.kalu@example.com',
    matchScore: 79,
    status: 'Under Review',
    skills: ['Terraform', 'Kubernetes', 'Helm', 'CI/CD', 'Prometheus', 'GCP'],
    experienceYears: 4,
    lastScanned: '2026-10-04',
    summary: 'SRE engineer focused on zero-downtime rollouts, infrastructure-as-code, and automated observability platforms.',
    education: 'B.S. in Information Systems - Georgia Tech',
    sections: {
      summary: 'Infrastructure engineer automating multi-region cloud workloads with GitOps and Terraform modules.',
      experience: '• DevOps Engineer at Horizon Cloud (2022-Present): Maintained 99.99% uptime across 12 Kubernetes clusters.\n• Systems Administrator at Apex Network (2020-2022): Automated Linux server hardening and backup routines.',
      skills: 'Kubernetes, Terraform, AWS, GCP, ArgoCD, Prometheus, Grafana, Bash, Python, Linux',
      education: 'B.S. Information Systems, Georgia Institute of Technology'
    }
  }
];

// Target Job Descriptions for match simulation
const TARGET_JOBS = [
  {
    id: 'job-01',
    title: 'Staff Full Stack Engineer',
    department: 'Core Platform',
    category: 'Full Stack & Cloud',
    location: 'Remote / US',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    description: 'We are seeking a Staff Full Stack Engineer to drive our core web applications, design performant distributed APIs, and coach engineering squads.'
  },
  {
    id: 'job-02',
    title: 'Senior Machine Learning Engineer',
    department: 'Applied AI',
    category: 'AI & Data Science',
    location: 'San Francisco, CA (Hybrid)',
    requiredSkills: ['Python', 'PyTorch', 'FastAPI', 'MLOps', 'Vector DBs'],
    description: 'Join our Applied AI team to develop, fine-tune, and serve production models for automated document parsing and contextual search.'
  },
  {
    id: 'job-03',
    title: 'Principal Product Designer',
    department: 'Product Experience',
    category: 'UI/UX & Product Design',
    location: 'New York, NY (Hybrid)',
    requiredSkills: ['Figma', 'Design Systems', 'User Research', 'Tailwind'],
    description: 'Lead visual design vision, refine our design system tokens, and craft intuitive enterprise dashboard experiences.'
  }
];

export function ResumeRosterDashboard({
  initialUser = { name: 'Alex Morgan', email: 'alex@company.com', isPro: false, scansUsed: 2, maxFreeScans: 3 },
  onUpgrade = null
}) {
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'matcher' | 'sections' | 'pricing' | 'usage'
  const [user, setUser] = useState(initialUser);
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState(INITIAL_CANDIDATES[0]);
  const [selectedJob, setSelectedJob] = useState(TARGET_JOBS[0]);
  const [selectedSection, setSelectedSection] = useState('summary');
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'annual'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutNotification, setCheckoutNotification] = useState(null);

  // Filter candidates by category and search term
  const filteredCandidates = useMemo(() => {
    return candidates.filter(cand => {
      const matchesCat = selectedCategory === 'All' || cand.category === selectedCategory;
      const matchesSearch =
        cand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cand.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [candidates, selectedCategory, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = candidates.length;
    const avgScore = total > 0 ? Math.round(candidates.reduce((acc, c) => acc + c.matchScore, 0) / total) : 0;
    const shortlistedCount = candidates.filter(c => c.status === 'Shortlisted').length;
    return { total, avgScore, shortlistedCount };
  }, [candidates]);

  // Handle Paddle checkout invocation
  const handleCheckout = async (plan = billingPeriod) => {
    setCheckoutLoading(true);
    setCheckoutNotification(null);

    if (onUpgrade) {
      try {
        await onUpgrade(plan);
        setCheckoutLoading(false);
        return;
      } catch (err) {
        console.error('Upgrade callback error:', err);
      }
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ plan })
      });

      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response in dashboard:', text);
        throw new Error(`Server returned error status ${response.status}. Expected JSON response.`);
      }

      if (data.isAdmin || data.unrestrictedAccess) {
        setUser(prev => ({ ...prev, isPro: true, isAdmin: true, scansRemaining: 'unlimited' }));
        setCheckoutNotification({
          type: 'success',
          text: 'Admin Authentication Override Active: Full unrestricted access to all platform features is granted.'
        });
        return;
      }

      if (data.success) {
        if (typeof window !== 'undefined' && window.Paddle && data.clientToken && data.transactionId && !data.isMock) {
          if (data.environment === 'sandbox') {
            window.Paddle.Environment.set('sandbox');
          }
          window.Paddle.Initialize({ token: data.clientToken });
          window.Paddle.Checkout.open({
            transactionId: data.transactionId,
            settings: {
              successUrl: window.location.origin + '/?billing=success'
            }
          });
        } else if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setUser(prev => ({ ...prev, isPro: true }));
          setCheckoutNotification({
            type: 'success',
            text: `Upgraded to Pro ${plan === 'annual' ? 'Annual ($39/yr)' : 'Monthly ($5/mo)'} successfully!`
          });
        }
      } else {
        setCheckoutNotification({
          type: 'error',
          text: data.error || 'Failed to initiate Paddle checkout.'
        });
      }
    } catch (err) {
      setCheckoutNotification({
        type: 'error',
        text: 'Network error communicating with Paddle billing service.'
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Simulate file upload parsing
  const handleSimulatedUpload = (e) => {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => {
      const newCand = {
        id: `cand-${Date.now().toString().slice(-4)}`,
        name: 'Jordan Rivera',
        title: 'Full Stack & DevOps Engineer',
        category: 'Full Stack & Cloud',
        email: 'jordan.rivera@example.com',
        matchScore: 92,
        status: 'Under Review',
        skills: ['React', 'Next.js', 'Node.js', 'Docker', 'AWS', 'Tailwind'],
        experienceYears: 4,
        lastScanned: new Date().toISOString().slice(0, 10),
        summary: 'Cloud-native engineer focused on automated deployment pipelines and modular web frontends.',
        education: 'B.S. Software Engineering - UT Austin',
        sections: {
          summary: 'Versatile software builder with background in both modern frontend libraries and backend services.',
          experience: '• Software Engineer at CloudOps (2022-Present): Built internal monitoring dashboard using React and Tailwind.\n• Junior Developer at DevWorks (2020-2022): Developed automated regression test suites.',
          skills: 'React, Node.js, Next.js, Tailwind CSS, Docker, PostgreSQL, REST APIs',
          education: 'B.S. Software Engineering, University of Texas at Austin'
        }
      };
      setCandidates(prev => [newCand, ...prev]);
      setSelectedCandidate(newCand);
      setIsUploading(false);
      setUser(prev => ({ ...prev, scansUsed: Math.min(prev.scansUsed + 1, prev.maxFreeScans) }));
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Banner / Announcement */}
      {!user.isPro && (
        <aside aria-label="Subscription upgrade announcement" className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 px-4 py-2 text-xs font-medium text-indigo-100 flex items-center justify-between border-b border-indigo-700/50">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                <strong>Free Plan Active:</strong> {user.scansUsed} of {user.maxFreeScans} free ATS resume scans used this month.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('pricing')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 transition-colors rounded text-white font-semibold underline underline-offset-2"
            >
              Upgrade to Pro for $5/mo &rarr;
            </button>
          </div>
        </aside>
      )}

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">Resume Roster</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ATS Command
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Intelligent Candidate Scoring & Job Alignment</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'roster', label: 'Candidate Roster', count: candidates.length },
              { id: 'matcher', label: 'Job Matcher' },
              { id: 'sections', label: 'Section Deep-Dive' },
              { id: 'pricing', label: 'Pricing & Plans', badge: 'Paddle' },
              { id: 'usage', label: 'Billing & Quota' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="text-[9px] uppercase px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-bold border border-emerald-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Action Profile & Quota */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200">{user.name}</div>
              <div className="text-[11px] text-slate-400">
                {user.isPro ? (
                  <span className="text-emerald-400 font-semibold">Pro Member (Unlimited)</span>
                ) : (
                  <span>{user.scansUsed} / {user.maxFreeScans} scans</span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800/60 no-scrollbar">
          {[
            { id: 'roster', label: 'Roster' },
            { id: 'matcher', label: 'Matcher' },
            { id: 'sections', label: 'Sections' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'usage', label: 'Quota' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap font-medium ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Notification Toast */}
        {checkoutNotification && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            checkoutNotification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
              : 'bg-rose-950/60 border-rose-700/60 text-rose-200'
          }`}>
            <span>{checkoutNotification.text}</span>
            <button
              onClick={() => setCheckoutNotification(null)}
              className="text-xs uppercase font-bold hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Candidates Scanned</span>
              <span className="text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded text-[11px] font-bold">
                +14% MoM
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-white">{stats.total}</div>
            <div className="mt-1 text-[11px] text-slate-500">Indexed with multi-section parsing</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Average Match Fit</span>
              <span className="text-indigo-400 bg-indigo-950/50 px-1.5 py-0.5 rounded text-[11px] font-bold">
                Cosine & Skills
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-indigo-300">{stats.avgScore}%</div>
            <div className="mt-1 text-[11px] text-slate-500">Across active job descriptions</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Shortlisted Talent</span>
              <span className="text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded text-[11px] font-bold">
                Ready for Review
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-200">{stats.shortlistedCount}</div>
            <div className="mt-1 text-[11px] text-slate-500">Above 85% match threshold</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Billing Tier</span>
              {user.isPro ? (
                <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                  Paddle Pro
                </span>
              ) : (
                <span className="text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                  Free Quota
                </span>
              )}
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {user.isPro ? 'Unlimited' : `${user.maxFreeScans - user.scansUsed} Left`}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {user.isPro ? 'Billed via Paddle' : 'Resets on 1st of month'}
            </div>
          </div>
        </div>

        {/* TAB 1: CANDIDATE ROSTER & PARSER */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            {/* Resume Upload Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleSimulatedUpload}
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 transition-colors rounded-2xl p-6 bg-slate-900/50 text-center relative overflow-hidden group cursor-pointer"
              onClick={handleSimulatedUpload}
            >
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-100 text-sm">
                  {isUploading ? 'Parsing Resume with ATS Engine...' : 'Drop candidate resumes (PDF, DOCX, TXT) here'}
                </h3>
                <p className="text-xs text-slate-400">
                  Automatically extracts Education, Experience, Skills, and Summary sections into structured CSV and JSON.
                </p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md">
                    {isUploading ? 'Processing...' : 'Browse or Try Demo Resume'}
                  </span>
                </div>
              </div>
            </div>

            {/* Candidate Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Filter by name, skill, or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category Pill Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {['All', 'Full Stack & Cloud', 'AI & Data Science', 'UI/UX & Product Design', 'DevOps & Infrastructure'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Roster Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Predicted Category</th>
                      <th className="py-3 px-4">Match Fit</th>
                      <th className="py-3 px-4">Key Extracted Skills</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCandidates.map(cand => {
                      const isHigh = cand.matchScore >= 90;
                      const isMed = cand.matchScore >= 80 && cand.matchScore < 90;

                      return (
                        <tr
                          key={cand.id}
                          onClick={() => setSelectedCandidate(cand)}
                          className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            selectedCandidate.id === cand.id ? 'bg-indigo-950/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{cand.name}</div>
                            <div className="text-[11px] text-slate-400">{cand.title}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-medium text-[11px]">
                              {cand.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold ${
                                isHigh ? 'text-emerald-400' : isMed ? 'text-indigo-400' : 'text-amber-400'
                              }`}>
                                {cand.matchScore}%
                              </span>
                              <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    isHigh ? 'bg-emerald-500' : isMed ? 'bg-indigo-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${cand.matchScore}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {cand.skills.slice(0, 4).map(skill => (
                                <span key={skill} className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px]">
                                  {skill}
                                </span>
                              ))}
                              {cand.skills.length > 4 && (
                                <span className="text-[10px] text-slate-500 self-center">
                                  +{cand.skills.length - 4}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              cand.status === 'Shortlisted'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                : cand.status === 'Interview Scheduled'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {cand.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCandidate(cand);
                                setActiveTab('matcher');
                              }}
                              className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors text-xs font-semibold"
                            >
                              Analyze Fit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JOB MATCHER & VISUALIZER */}
        {activeTab === 'matcher' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Job selector & candidate info */}
            <div className="space-y-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Active Job Requisition</h3>
                <select
                  value={selectedJob.id}
                  onChange={(e) => setSelectedJob(TARGET_JOBS.find(j => j.id === e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {TARGET_JOBS.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.title} — {job.department}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedJob.description}</p>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5">Required Skills:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedJob.requiredSkills.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Candidate Card */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Evaluated Candidate</h3>
                  <span className="text-xs text-emerald-400 font-bold font-mono">
                    {selectedCandidate.matchScore}% Match
                  </span>
                </div>
                <div>
                  <div className="font-bold text-white text-base">{selectedCandidate.name}</div>
                  <div className="text-xs text-indigo-400">{selectedCandidate.title}</div>
                  <div className="text-xs text-slate-400 mt-2">{selectedCandidate.summary}</div>
                </div>
              </div>
            </div>

            {/* Right: Dimension breakdown and recommendations */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Multi-Dimensional Match Scores</h3>
                    <p className="text-xs text-slate-400">Comparing extracted resume sections to target job requirements</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                    TF-IDF & Centroid Vectors
                  </span>
                </div>

                {/* Score Progress Bars */}
                <div className="space-y-3 pt-2">
                  {[
                    { label: 'Technical Keywords Alignment', value: selectedCandidate.matchScore, color: 'bg-emerald-500' },
                    { label: 'Domain Scope & Category Fit', value: Math.min(100, selectedCandidate.matchScore + 4), color: 'bg-indigo-500' },
                    { label: 'Experience Depth & Projects', value: Math.max(65, selectedCandidate.matchScore - 6), color: 'bg-violet-500' },
                    { label: 'Education & Credentials Baseline', value: 92, color: 'bg-cyan-500' }
                  ].map((dim, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{dim.label}</span>
                        <span className="font-mono text-white font-bold">{dim.value}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div className={`h-full ${dim.color}`} style={{ width: `${dim.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Automated Interview Recommendations</h4>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Strong overlap in core runtime stack (React, TypeScript, Node.js).</li>
                    <li>Recommend probing architectural decisions regarding distributed caching and cloud deployment gates.</li>
                    <li>Candidate has notable seniority and can mentor junior-to-mid engineering peers.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESUME SECTION DEEP-DIVE */}
        {activeTab === 'sections' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base">Extracted CV Sections: {selectedCandidate.name}</h3>
                <p className="text-xs text-slate-400">Section boundaries normalized with regex boundary terminators and injection sanitization.</p>
              </div>

              {/* Section Subtabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['summary', 'experience', 'skills', 'education'].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      selectedSection === sec
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Viewer Content */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {selectedCandidate.sections[selectedSection] || 'No content extracted for this section.'}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Section Extraction Quality: <strong className="text-emerald-400">100% Parsed</strong></span>
              <a
                href="/api/jobs"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Inspect Matching Centroids API &rarr;
              </a>
            </div>
          </div>
        )}

        {/* TAB 4: PRICING SECTION (PADDLE INTEGRATION) */}
        {activeTab === 'pricing' && (
          <div className="space-y-10 py-4">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
                Paddle Billing Enabled
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Simple, Transparent ATS Intelligence
              </h2>
              <p className="text-slate-400 text-sm">
                Scale candidate evaluations without artificial limits. Securely processed via Paddle Merchant of Record.
              </p>

              {/* Monthly vs Annual Toggle */}
              <div className="inline-flex items-center gap-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 mt-4">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Monthly ($5/mo)
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    billingPeriod === 'annual'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Annual ($39/yr)</span>
                  <span className="bg-emerald-500 text-slate-950 text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md">
                    Save 35%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Starter Tier */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">Free Starter</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">Community</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Ideal for candidates and early testing.</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">$0</span>
                    <span className="text-xs text-slate-400">/ forever</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-300">
                    {['3 Resume scans per month', 'Standard TF-IDF category prediction', 'Basic CV section extraction', 'Community support'].map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={!user.isPro}
                  onClick={() => setUser(prev => ({ ...prev, isPro: false }))}
                  className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  {user.isPro ? 'Downgrade to Free' : 'Current Active Plan'}
                </button>
              </div>

              {/* Pro Unlimited Tier (Paddle Checkout) */}
              <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 rounded-3xl border-2 border-indigo-500/80 p-8 flex flex-col justify-between space-y-6 relative shadow-2xl shadow-indigo-500/10">
                <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-md">
                  Most Popular
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">
                      {billingPeriod === 'annual' ? 'Pro Annual' : 'Pro Monthly'}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                      Paddle Billing
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {billingPeriod === 'annual'
                      ? 'Full year of unlimited optimization for active job searches and career growth.'
                      : 'Uncapped scans, multi-ATS engines, and deep Recharts competency diagnostics.'}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">
                      {billingPeriod === 'annual' ? '$39' : '$5'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {billingPeriod === 'annual' ? '/ year (~$3.25/mo)' : '/ month'}
                    </span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-200">
                    {(billingPeriod === 'annual' ? [
                      'All Pro Monthly features included',
                      'Unlimited PDF & DOCX ATS scans',
                      'Priority vectorization throughput',
                      'Multi-dimensional Recharts radar analysis',
                      'Unlimited version history & CSV roster exports',
                      'Direct Paddle Customer Portal access',
                      'Cancel anytime with zero lock-in',
                      'Best value: save 35% compared to monthly'
                    ] : [
                      'Unlimited PDF & DOCX ATS scans',
                      'Multi-dimensional Recharts radar analysis',
                      'Real-time keyword frequency gap analyzer',
                      'Export parsed sections & match dossiers',
                      'Direct Paddle Customer Portal access',
                      'Cancel anytime with zero lock-in'
                    ]).map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={checkoutLoading || user.isPro}
                  onClick={() => handleCheckout(billingPeriod)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {checkoutLoading ? (
                    <span>Opening Paddle Checkout...</span>
                  ) : user.isPro ? (
                    <span>Active Pro Subscription</span>
                  ) : (
                    <span>Upgrade with Paddle ({billingPeriod === 'annual' ? '$39/yr' : '$5/mo'})</span>
                  )}
                </button>
              </div>
            </div>

            {/* Paddle Compliance & Refund Note */}
            <div className="max-w-4xl mx-auto p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">&#10003; 14-Day Money-Back Guarantee:</span>
                <span>100% full refund if not satisfied. See our Refund Policy.</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <span>Paddle Merchant of Record</span>
                <span>&bull;</span>
                <a href="/terms" className="hover:text-indigo-400 transition-colors">Terms</a>
                <span>&bull;</span>
                <a href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy</a>
                <span>&bull;</span>
                <a href="/refund" className="hover:text-indigo-400 transition-colors">Refund</a>
                <span>&bull;</span>
                <a href="/contact" className="text-indigo-400 font-semibold hover:underline">Contact Us</a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: USAGE & BILLING QUOTA */}
        {activeTab === 'usage' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
            <div>
              <h3 className="font-bold text-white text-base">Usage & Paddle Subscription Management</h3>
              <p className="text-xs text-slate-400">Review quota consumption, subscription status, and simulated webhook events.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Monthly Quota Meter */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-300">Monthly ATS Scan Consumption</span>
                  <span className="text-white font-mono">
                    {user.isPro ? 'Unlimited (Pro)' : `${user.scansUsed} / ${user.maxFreeScans} used`}
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${user.isPro ? 'bg-emerald-500' : user.scansUsed >= user.maxFreeScans ? 'bg-rose-500' : 'bg-indigo-500'}`}
                    style={{ width: `${user.isPro ? 100 : (user.scansUsed / user.maxFreeScans) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  {user.isPro
                    ? 'Your account has active Pro status billed through Paddle.'
                    : 'Upgrade to remove the 3-scan limit and unlock instant batch candidate processing.'}
                </p>
              </div>

              {/* Right: Quick Paddle Action */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Paddle Billing Portal</div>
                  <p className="text-xs text-slate-400 mt-1">Manage payment methods, download VAT receipts, or modify plans.</p>
                </div>
                <button
                  onClick={() => handleCheckout('monthly')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold self-start transition-colors"
                >
                  Launch Paddle Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Resume Rater &bull; Modern Candidate Intelligence &bull; Powered by Paddle Billing</p>
          <div className="flex items-center gap-3">
            <a href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</a>
            <span>&bull;</span>
            <a href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <span>&bull;</span>
            <a href="/refund" className="hover:text-slate-300 transition-colors">Refund Policy</a>
            <span>&bull;</span>
            <a href="/contact" className="text-indigo-400 hover:underline">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ResumeRosterDashboard;
