import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  FileCode, FileText, FileJson, File, Settings, AlertTriangle, FileWarning
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const FolderIcon = ({ isOpen }) => {
  return isOpen ? <FolderOpen className="h-4 w-4 text-zinc-400 shrink-0" /> : <Folder className="h-4 w-4 text-zinc-400 shrink-0" />;
};

const FileIcon = ({ filename }) => {
  const ext = filename.split('.').pop().toLowerCase();
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'c', 'cpp', 'java', 'kt', 'swift', 'sh'].includes(ext)) {
    return <FileCode className="h-4 w-4 text-zinc-400 shrink-0" />;
  }
  if (['json', 'yaml', 'yml'].includes(ext)) {
    return <FileJson className="h-4 w-4 text-zinc-400 shrink-0" />;
  }
  if (['md', 'txt'].includes(ext)) {
    return <FileText className="h-4 w-4 text-zinc-400 shrink-0" />;
  }
  if (['config', 'env', 'gitignore'].includes(filename) || ext === 'config' || ext === 'env' || filename.startsWith('.')) {
    return <Settings className="h-4 w-4 text-zinc-400 shrink-0" />;
  }
  return <File className="h-4 w-4 text-zinc-400 shrink-0" />;
};

// Check if file is binary by extension
const isBinaryFile = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const binaryExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'tar', 'gz', '7z',
    'mp3', 'mp4', 'woff', 'woff2', 'eot', 'ttf', 'otf', 'bin', 'exe', 'dll', 'so',
    'dylib', 'db', 'sqlite', 'lockb', 'ds_store'
  ];
  return binaryExtensions.includes(ext);
};

const FileNode = ({ item, onFileClick, selectedPath, analysisId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (item.type === 'dir') {
      if (!isOpen && children.length === 0) {
        setLoading(true);
        try {
          const response = await client.get(`/analysis/history/${analysisId}/contents?path=${encodeURIComponent(item.path)}`);
          const sortedData = response.data.sort((a, b) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name);
            }
            return a.type === 'dir' ? -1 : 1;
          });
          setChildren(sortedData);
        } catch (err) {
          console.error('Failed to load subfolder:', err);
        } finally {
          setLoading(false);
        }
      }
      setIsOpen(!isOpen);
    } else {
      onFileClick(item);
    }
  };

  const isSelected = selectedPath === item.path;

  return (
    <div className="select-none">
      <div 
        onClick={handleToggle}
        className={`flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-all duration-150 ${
          isSelected 
            ? 'bg-zinc-800 text-white border border-zinc-700' 
            : item.type === 'dir' 
              ? 'hover:bg-zinc-900/60 text-zinc-300 hover:text-white border border-transparent' 
              : 'hover:bg-zinc-900/80 text-zinc-400 hover:text-white border border-transparent'
        }`}
      >
        {item.type === 'dir' && (
          <span className="text-slate-500 hover:text-white">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
        {item.type === 'dir' ? (
          <>
            {loading ? (
              <div className="h-3.5 w-3.5 border-2 border-zinc-800 border-t-white rounded-full animate-spin shrink-0" />
            ) : (
              <FolderIcon isOpen={isOpen} />
            )}
            <span className="text-xs font-semibold tracking-wide font-sans truncate">{item.name}</span>
          </>
        ) : (
          <>
            <span className="ml-5">
              <FileIcon filename={item.name} />
            </span>
            <span className="text-xs font-mono truncate">{item.name}</span>
          </>
        )}
      </div>

      {isOpen && item.type === 'dir' && (
        <div className="pl-3.5 border-l border-slate-800/80 ml-3 mt-1 space-y-1">
          {children.length === 0 && !loading && (
            <div className="text-xs text-slate-600 py-1 pl-6 italic">Empty folder</div>
          )}
          {children.map(child => (
            <FileNode 
              key={child.sha} 
              item={child} 
              onFileClick={onFileClick} 
              selectedPath={selectedPath}
              analysisId={analysisId} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer = ({ analysisId }) => {
  const [rootItems, setRootItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fetchingFile, setFetchingFile] = useState(false);
  const [forceRender, setForceRender] = useState(false);

  useEffect(() => {
    const fetchRoot = async () => {
      try {
        setLoading(true);
        const response = await client.get(`/analysis/history/${analysisId}/contents`);
        const sortedData = response.data.sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'dir' ? -1 : 1;
        });
        setRootItems(sortedData);
      } catch (err) {
        console.error('Failed to load file tree:', err);
        setError('Failed to load file structure. Make sure GITHUB_TOKEN is correct or try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoot();
  }, [analysisId]);

  const handleFileClick = async (file) => {
    setSelectedFile(file);
    setFileContent('');
    setForceRender(false);
    
    // Skip fetching if file is binary
    if (isBinaryFile(file.name)) {
      return;
    }

    // Skip fetching or show warning if file is too large (like > 500KB)
    if (file.size > 500000) {
      return;
    }

    setFetchingFile(true);
    try {
      const response = await client.get(`/analysis/history/${analysisId}/contents?path=${encodeURIComponent(file.path)}`);
      setFileContent(response.data.content || '');
    } catch (err) {
      console.error('Failed to fetch file content:', err);
      setFileContent('Error loading file content.');
    } finally {
      setFetchingFile(false);
    }
  };

  const getLanguage = (path) => {
    if (!path) return 'text';
    const ext = path.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'c':
      case 'h':
        return 'c';
      case 'cpp':
      case 'hpp':
        return 'cpp';
      case 'java':
        return 'java';
      case 'cs':
        return 'csharp';
      case 'rb':
        return 'ruby';
      case 'php':
        return 'php';
      case 'kt':
        return 'kotlin';
      case 'swift':
        return 'swift';
      case 'sh':
      case 'bash':
        return 'bash';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'md':
        return 'markdown';
      case 'json':
        return 'json';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'xml':
        return 'xml';
      default:
        return 'text';
    }
  };

  const renderCodePaneContent = () => {
    if (!selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-slate-500">
          <File className="h-12 w-12 text-slate-700 mb-3 animate-pulse" />
          <h4 className="text-sm font-bold text-slate-400">No File Selected</h4>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Expand folders in the sidebar explorer and select a file to view its source code.
          </p>
        </div>
      );
    }

    if (isBinaryFile(selectedFile.name)) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 border border-dashed border-slate-800 bg-slate-950/40 rounded-xl m-4">
          <FileWarning className="h-10 w-10 text-amber-500 mb-3" />
          <h4 className="text-sm font-bold text-slate-300">Binary File Detected</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Rendering for image, audio, video, or archive files is disabled to avoid browser performance crashes.
          </p>
          <span className="text-[10px] font-semibold text-slate-600 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md mt-4">
            Size: {(selectedFile.size / 1024).toFixed(1)} KB &bull; Name: {selectedFile.name}
          </span>
        </div>
      );
    }

    const isLarge = selectedFile.size > 150000; // > 150KB is treated as large text
    const isTooLarge = selectedFile.size > 500000; // > 500KB is disabled

    if (isTooLarge) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 border border-dashed border-slate-800 bg-slate-950/40 rounded-xl m-4">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
          <h4 className="text-sm font-bold text-slate-300">File Too Large</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            This file exceeds the safety size limit of 500 KB. Rendering this file would cause severe page lag or crash the browser.
          </p>
          <span className="text-[10px] font-semibold text-slate-600 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md mt-4 font-mono">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>
        </div>
      );
    }

    if (isLarge && !forceRender) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 border border-dashed border-slate-800 bg-slate-950/40 rounded-xl m-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
          <h4 className="text-sm font-bold text-slate-300">Large Text File</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            This file size is {(selectedFile.size / 1024).toFixed(1)} KB (e.g. lock file or large bundle). Rendering syntax highlighting might cause brief page lag.
          </p>
          <button
            onClick={() => {
              setForceRender(true);
              setFetchingFile(true);
              client.get(`/analysis/history/${analysisId}/contents?path=${encodeURIComponent(selectedFile.path)}`)
                .then(res => {
                  setFileContent(res.data.content || '');
                  setFetchingFile(false);
                })
                .catch(err => {
                  console.error(err);
                  setFileContent('Error loading file content.');
                  setFetchingFile(false);
                });
            }}
            className="rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-4 py-2 text-xs font-bold transition-all duration-200 mt-5"
          >
            Render Code Anyway
          </button>
        </div>
      );
    }

    if (fetchingFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
          <div className="h-8 w-8 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
          <span className="mt-4 text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">Loading content...</span>
        </div>
      );
    }

    return (
      <div className="relative h-full flex flex-col animate-fade-in">
        {/* Code Header Bar */}
        <div className="flex justify-between items-center bg-zinc-900 px-4 py-2.5 rounded-t-lg">
          <span className="text-xs font-semibold text-zinc-300 font-mono select-all truncate max-w-md">
            {selectedFile.path}
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-black px-2 py-0.5 rounded border border-zinc-800 font-mono">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>
        </div>
        
        {/* syntax highlighting window */}
        <div className="flex-grow overflow-auto p-4 bg-black rounded-b-lg max-h-[600px] border border-zinc-900 border-t-0 font-mono">
          <SyntaxHighlighter
            language={getLanguage(selectedFile.path)}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              background: 'transparent',
              fontSize: '0.785rem',
              lineHeight: '1.45',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
            showLineNumbers
          >
            {fileContent}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
        <div className="h-8 w-8 border-3 border-zinc-800 border-t-white rounded-full animate-spin" />
        <span className="mt-4 text-xs font-semibold text-zinc-400 tracking-wider">LOADING FILE EXPLORER...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border border-red-500/20 bg-red-500/5 rounded-xl">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <h4 className="text-sm font-bold text-white">Tree Fetching Error</h4>
        <p className="text-xs text-slate-400 max-w-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[500px] animate-fade-in">
      {/* File Tree Sidebar */}
      <div className="col-span-1 border border-zinc-800 bg-zinc-950/30 p-3 rounded-xl max-h-[700px] overflow-y-auto space-y-1 scrollbar-thin">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-900/60 pb-2 mb-3">
          Repository Tree
        </h4>
        {rootItems.length === 0 ? (
          <div className="text-xs text-zinc-600 italic p-2">No files found.</div>
        ) : (
          rootItems.map(item => (
            <FileNode 
              key={item.sha} 
              item={item} 
              onFileClick={handleFileClick} 
              selectedPath={selectedFile?.path}
              analysisId={analysisId} 
            />
          ))
        )}
      </div>

      {/* Code Viewer Panel */}
      <div className="col-span-3 border border-zinc-800 bg-black rounded-xl max-h-[700px] overflow-hidden">
        {renderCodePaneContent()}
      </div>
    </div>
  );
};

export default FileExplorer;
