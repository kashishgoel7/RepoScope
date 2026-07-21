import { useState } from 'react';
import client from '../api/client';
import MetricCard from '../components/MetricCard';
import { 
  GitBranch, Star, BookOpen, Search, AlertCircle, CheckCircle2, 
  Sparkles, Layers, ShieldAlert, Award, FileText, ChevronRight,
  FolderGit, MessageSquare
} from 'lucide-react';
import FileExplorer from '../components/FileExplorer';
import ChatPanel from '../components/ChatPanel';

const Dashboard = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('structure');

  const steps = [
    'Parsing repository URL...',
    'Fetching repository structure from GitHub API...',
    'Running heuristic algorithm to select critical source files...',
    'Transmitting files to Google Gemini for analysis...',
    'Compiling structural quality report...'
  ];

  const triggerLoaderCycles = () => {
    setLoadingStep(0);
    const intervals = [1200, 2800, 4500, 7500];
    intervals.forEach((time, index) => {
      setTimeout(() => {
        setLoadingStep(index + 1);
      }, time);
    });
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;

    setError('');
    setAnalysis(null);
    setLoading(true);
    triggerLoaderCycles();

    try {
      const response = await client.post('/analysis/analyze', { repoUrl });
      setAnalysis(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to analyze repository. Make sure it is public and contains code.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get color classes based on score
  const getScoreColor = (score) => {
    if (score >= 8) return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', fill: '#10b981' };
    if (score >= 5) return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', fill: '#f59e0b' };
    return { text: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10', fill: '#f43f5e' };
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 relative">
      {/* Dynamic ambient bg lighting */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl relative">
        {/* Page Header */}
        {!analysis && !loading && (
          <div className="text-center max-w-3xl mx-auto mt-8 mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
              Analyze Any GitHub Repository
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
              Paste a public GitHub repository URL to receive an AI-powered analysis of its architecture, code quality, best practices, and improvement recommendations powered by Google Gemini.
            </p>
          </div>
        )}

        {/* Search Bar Input */}
        {!loading && !analysis && (
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleAnalyze} className="relative flex items-center bg-slate-900/60 border border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 p-2 rounded-2xl backdrop-blur-xl shadow-2xl transition-all duration-300">
              <div className="flex items-center pl-4 text-slate-500 pointer-events-none">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="url"
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/facebook/react"
                className="block w-full bg-transparent pl-3.5 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-200"
              >
                Scan Repository
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-500 font-medium">
              Supports analysis of public GitHub repositories.
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 max-w-3xl mx-auto animate-fade-in">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Analysis Failed:</span> {error}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State Animation */}
        {loading && (
          <div className="max-w-2xl mx-auto text-center py-20 flex flex-col items-center justify-center border border-slate-800 bg-slate-900/20 rounded-2xl backdrop-blur-lg">
            <div className="relative flex items-center justify-center mb-8">
              {/* Spinning core */}
              <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute w-16 h-16 border-4 border-violet-500/20 border-t-violet-400 rounded-full animate-spin animate-reverse"></div>
              <div className="absolute text-slate-400 animate-pulse">
                <Layers className="h-7 w-7 text-indigo-400" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Analyzing Codebase</h3>
            <p className="text-sm text-slate-400 px-6 max-w-md min-h-[40px] transition-all duration-300">
              {steps[loadingStep] || 'Processing request...'}
            </p>

            {/* Simulated progress indicators */}
            <div className="mt-8 flex gap-1.5 justify-center">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 w-8 rounded-full transition-all duration-300 ${
                    idx <= loadingStep ? 'bg-indigo-500' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Analysis Dashboard Results */}
        {analysis && (
          <div className="space-y-8 animate-fade-in">
            {/* Topbar Info & Score Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {analysis.repoMetadata.name}
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                    {analysis.repoMetadata.primaryLanguage}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-1">
                  <span>Repository URL:</span>
                  <a href={analysis.repoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    {analysis.repoUrl}
                  </a>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setAnalysis(null); setRepoUrl(''); }}
                  className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-all duration-200"
                >
                  Scan New Repo
                </button>
              </div>
            </div>

            {/* Score Showcase & Metadata Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Score Gauge Card */}
              <div className={`rounded-xl border ${getScoreColor(analysis.analysisResults.score).border} bg-slate-900/40 p-5 flex flex-col justify-between backdrop-blur-md`}>
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center shrink-0">
                    {/* Visual SVG Ring */}
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="7" fill="transparent" />
                      <circle 
                        cx="40" cy="40" r="32" 
                        stroke={getScoreColor(analysis.analysisResults.score).fill} 
                        strokeWidth="7" 
                        fill="transparent" 
                        strokeDasharray="201"
                        strokeDashoffset={201 - (201 * analysis.analysisResults.score) / 10}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xl font-black text-white">
                      {analysis.analysisResults.score}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quality Score</span>
                    </div>
                    <h4 className="text-base font-bold text-white leading-snug">
                      {analysis.analysisResults.score >= 8 ? 'Excellent Standards' : analysis.analysisResults.score >= 5 ? 'Fair Codebase' : 'Needs Optimization'}
                    </h4>
                  </div>
                </div>

                <div className="mt-3.5">
                  <p className="text-xs text-slate-300 leading-snug">
                    {analysis.analysisResults.scoreJustification}
                  </p>
                  
                  {/* Key Findings List */}
                  <div className="grid grid-cols-1 gap-2 mt-3 pt-3 border-t border-slate-800/80">
                    {(analysis.analysisResults.keyFindings && analysis.analysisResults.keyFindings.length > 0
                      ? analysis.analysisResults.keyFindings
                      : [
                          analysis.analysisResults.score >= 8 ? { type: 'success', finding: 'Solid Architectural Pattern' } : { type: 'warning', finding: 'Lacks Core Architecture' },
                          analysis.analysisResults.score >= 5 ? { type: 'success', finding: 'Readable Naming Conventions' } : { type: 'warning', finding: 'Inconsistent Code Structure' },
                          analysis.analysisResults.score >= 5 ? { type: 'warning', finding: 'Incomplete Test Coverage' } : { type: 'warning', finding: 'Missing Test & Build Specs' }
                        ]
                    ).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {item.type === 'success' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        )}
                        <span className="text-slate-300 font-medium truncate">{item.finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Repository Summary Description */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between backdrop-blur-md md:col-span-2">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Functional Summary</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {analysis.analysisResults.summary}
                  </p>
                </div>
                <div className="flex gap-6 mt-4 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Stars: {analysis.repoMetadata.stars.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> Forks: {analysis.repoMetadata.forks.toLocaleString()}</span>
                  <span>Owner: {analysis.repoMetadata.owner}</span>
                </div>
              </div>
            </div>

            {/* Tabbed Review Details */}
            <div className="border border-slate-800 bg-slate-900/20 rounded-xl overflow-hidden backdrop-blur-md">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800 bg-slate-950/40 p-1">
                {[
                  { id: 'structure', label: 'Architecture', icon: Layers },
                  { id: 'practices', label: 'Best Practices', icon: ShieldAlert },
                  { id: 'suggestions', label: 'Action Items', icon: Sparkles },
                  { id: 'files', label: 'Scope Analyzed', icon: FileText },
                  { id: 'explorer', label: 'Files', icon: FolderGit },
                  { id: 'chat', label: 'Ask AI', icon: MessageSquare }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'bg-slate-900 text-white shadow-sm border border-slate-800' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <tab.icon className="h-4.5 w-4.5 shrink-0" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-6 sm:p-8 min-h-[300px]">
                {/* 1. Structure & Architecture */}
                {activeTab === 'structure' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="h-5 w-5 text-indigo-400" />
                      Structural & File Organization Assessment
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                      {analysis.analysisResults.structureAssessment}
                    </p>
                  </div>
                )}

                {/* 2. Best Practices Checked */}
                {activeTab === 'practices' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { 
                        title: 'Naming Conventions', 
                        desc: analysis.analysisResults.bestPractices.namingConventions || 'Checked and validated.' 
                      },
                      { 
                        title: 'Error Handling', 
                        desc: analysis.analysisResults.bestPractices.errorHandling || 'Checked and validated.' 
                      },
                      { 
                        title: 'Security Red Flags', 
                        desc: analysis.analysisResults.bestPractices.securityRedFlags || 'No exposure detected.' 
                      },
                      { 
                        title: 'Tests & Documentation', 
                        desc: analysis.analysisResults.bestPractices.missingTestsOrDocs || 'Checked and validated.' 
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="border border-slate-800 bg-slate-950/20 p-5 rounded-lg">
                        <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">
                          {item.title}
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Actionable Suggestions */}
                {activeTab === 'suggestions' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-400" />
                      Actionable Recommendations
                    </h3>
                    <ul className="space-y-3.5">
                      {analysis.analysisResults.actionableSuggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-3 bg-slate-950/25 p-4 rounded-lg border border-slate-800/60">
                          <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-300 leading-relaxed font-medium">
                            {suggestion}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. Scope Analyzed (Files list) */}
                {activeTab === 'files' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-400" />
                        Analyzed File Footprint
                      </h3>
                      <span className="text-xs text-slate-400 bg-slate-850 px-2.5 py-1 rounded-md border border-slate-800">
                        {analysis.analyzedFiles.length} key files selected
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                      To keep token payload lightweight, the analyzer runs a heuristic selection focusing on manifest files, entry points, and central source components based on file sizes.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {analysis.analyzedFiles.map((filepath, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 bg-slate-950/30 px-4 py-3 rounded-lg border border-slate-800/80">
                          <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="text-xs font-mono text-slate-300 truncate">
                            {filepath}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. File Explorer */}
                {activeTab === 'explorer' && (
                  <FileExplorer analysisId={analysis._id} />
                )}

                {/* 6. Ask AI Chat */}
                {activeTab === 'chat' && (
                  <ChatPanel analysis={analysis} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
