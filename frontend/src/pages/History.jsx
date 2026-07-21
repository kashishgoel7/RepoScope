import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { History as HistoryIcon, Calendar, ArrowRight, GitBranch, Star, Terminal } from 'lucide-react';

const History = () => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      const response = await client.get('/analysis/history');
      setHistoryList(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch analysis history. Please check back later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 8) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (score >= 5) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <span className="mt-4 text-slate-400 text-sm font-semibold tracking-wider">RETRIEVING HISTORY...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="mx-auto max-w-7xl relative">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <HistoryIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Analysis History</h1>
            <p className="text-sm text-slate-400 mt-1">Review and compare previously analyzed repositories</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {historyList.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 backdrop-blur-md max-w-2xl mx-auto">
            <Terminal className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1.5">No Repository Scans Yet</h3>
            <p className="text-sm text-slate-400 px-6 max-w-md mx-auto mb-6">
              You haven't run any codebase analyses yet. Paste a GitHub URL on the dashboard to trigger your first audit.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-500/10 transition-all duration-200"
            >
              Analyze First Repo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto">
            {historyList.map((item) => (
              <div 
                key={item._id} 
                className="border border-slate-800 bg-slate-900/40 backdrop-blur-md rounded-xl p-5 hover:border-slate-700 transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
              >
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {item.repoMetadata.name}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                      {item.repoMetadata.primaryLanguage}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getScoreColor(item.analysisResults.score)}`}>
                      Score: {item.analysisResults.score}/10
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-500 font-medium">
                    Owner: {item.repoMetadata.owner} &bull; URL:{' '}
                    <a href={item.repoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-400">
                      {item.repoUrl}
                    </a>
                  </p>

                  <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {item.analysisResults.summary}
                  </p>

                  <div className="flex gap-4 text-xs text-slate-500 items-center">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {formatDate(item.createdAt)}</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-slate-400" /> {item.repoMetadata.stars}</span>
                    <span className="flex items-center gap-1"><GitBranch className="h-3 w-3 text-slate-400" /> {item.repoMetadata.forks}</span>
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <Link
                    to={`/history/${item._id}`}
                    className="flex w-full md:w-auto items-center justify-center gap-1.5 rounded-lg border border-slate-800 group-hover:border-indigo-500/50 bg-slate-950/50 hover:bg-indigo-500/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-indigo-400 transition-all duration-200"
                  >
                    View Full Report
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
