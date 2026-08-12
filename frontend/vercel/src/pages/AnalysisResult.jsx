import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import {
  GitBranch, Star, BookOpen, AlertCircle, CheckCircle2,
  Sparkles, Layers, ShieldAlert, Award, FileText, ChevronRight, ArrowLeft,
  FolderGit, MessageSquare
} from 'lucide-react';
import FileExplorer from '../components/FileExplorer';
import ChatPanel from '../components/ChatPanel';

const AnalysisResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('structure');

  const fetchAnalysisDetails = async () => {
    try {
      const response = await client.get(`/analysis/history/${id}`);
      setAnalysis(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to retrieve analysis report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysisDetails();
  }, [id]);

  const getScoreColor = (score) => {
    if (score >= 8) return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', fill: '#10b981' };
    if (score >= 5) return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', fill: '#f59e0b' };
    return { text: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10', fill: '#f43f5e' };
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
          <span className="mt-4 text-zinc-400 text-sm font-semibold tracking-wider">Retrieving Report...</span>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-black px-4">
        <div className="text-center border border-zinc-800 bg-zinc-900/20 max-w-md p-8 rounded-xl backdrop-blur-md">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Report</h3>
          <p className="text-sm text-zinc-400 mb-6">{error || 'Analysis report could not be found.'}</p>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-zinc-100 py-10 px-4 sm:px-6 lg:px-8 relative animate-fade-in">
      
      <div className="mx-auto max-w-7xl relative space-y-8">
        {/* Navigation Link and Title Header */}
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6">
          <Link to="/history" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors w-fit">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to History
          </Link>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {analysis.repoMetadata.name}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {analysis.repoMetadata.primaryLanguage}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-1.5 flex items-center gap-1">
                <span>Repository URL:</span>
                <a href={analysis.repoUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                  {analysis.repoUrl}
                </a>
              </p>
            </div>
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
                  <Award className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quality Score</span>
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
                    <span className="text-zinc-300 font-medium truncate">{item.finding}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Repository Summary Description */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between backdrop-blur-md md:col-span-2">
            <div>
              <div className="flex items-center gap-1.5 text-zinc-400 mb-2">
                <BookOpen className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">Functional Summary</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {analysis.analysisResults.summary}
              </p>
            </div>
            <div className="flex gap-6 mt-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Stars: {analysis.repoMetadata.stars.toLocaleString()}</span>
              <span className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> Forks: {analysis.repoMetadata.forks.toLocaleString()}</span>
              <span>Owner: {analysis.repoMetadata.owner}</span>
            </div>
          </div>
        </div>

        {/* Tabbed Review Details */}
        <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl overflow-hidden backdrop-blur-md">
          {/* Tab Selector */}
          <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1">
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
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === tab.id
                    ? 'bg-zinc-900 text-white shadow-sm border border-zinc-800'
                    : 'text-zinc-400 hover:text-white'
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
                  <Layers className="h-5 w-5 text-zinc-400" />
                  Structural & File Organization Assessment
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
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
                  <div key={idx} className="border border-zinc-800 bg-zinc-950/20 p-5 rounded-lg">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      {item.title}
                    </h4>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
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
                  <Sparkles className="h-5 w-5 text-zinc-400" />
                  Actionable Recommendations
                </h3>
                <ul className="space-y-3.5">
                  {analysis.analysisResults.actionableSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-zinc-950/25 p-4 rounded-lg border border-zinc-800/60">
                      <CheckCircle2 className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-300 leading-relaxed font-medium">
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
                    <FileText className="h-5 w-5 text-zinc-400" />
                    Key Files Used for Analysis
                  </h3>
                  <span className="text-xs text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                    {analysis.analyzedFiles.length} key files selected
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-2 leading-relaxed">
                  These important repository files were selected by the AI to generate the architecture assessment, best practices, and actionable recommendations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {analysis.analyzedFiles.map((filepath, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 bg-zinc-950/30 px-4 py-3 rounded-lg border border-zinc-800/80">
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-xs font-mono text-zinc-300 truncate">
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
    </div>
  );
};

export default AnalysisResult;
