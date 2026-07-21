import axios from 'axios';

/**
 * Parse GitHub repository URL to extract owner and repo name.
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - http://github.com/owner/repo/tree/branch
 */
export const parseGitHubUrl = (url) => {
  if (!url) return null;

  // Clean URL: remove leading/trailing spaces
  const cleanedUrl = url.trim();

  // Regular expression to extract owner and repo name
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/i;
  const match = cleanedUrl.match(regex);

  if (!match) {
    throw new Error('Invalid GitHub URL. Must be a github.com repository URL.');
  }

  const owner = match[1];
  let repo = match[2];

  // Clean repo name from .git suffix or trailing slashes/subpaths
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  } else {
    // If there are subpaths (e.g. repo/tree/main), extract just the repo name
    const subpathIndex = repo.indexOf('/');
    if (subpathIndex !== -1) {
      repo = repo.substring(0, subpathIndex);
    }
  }

  return { owner, repo };
};

/**
 * Helper to get Axios configuration headers with optional GITHUB_TOKEN
 */
const getHeaders = () => {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
};

/**
 * Fetch Repository Metadata (name, description, default_branch, language, stars, forks, etc.)
 */
export const fetchRepoMetadata = async (owner, repo) => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await axios.get(url, { headers: getHeaders() });
    const data = response.data;

    return {
      name: data.name,
      owner: data.owner.login,
      description: data.description || '',
      primaryLanguage: data.language || 'Unknown',
      stars: data.stargazers_count,
      forks: data.forks_count,
      lastUpdated: new Date(data.updated_at),
      defaultBranch: data.default_branch || 'main',
    };
  } catch (error) {
    console.error('Error fetching repo metadata:', error.response?.data || error.message);
    const status = error.response?.status;
    if (status === 404) {
      throw new Error('Repository not found. Ensure it is public and the spelling is correct.');
    } else if (status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
      throw new Error('GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase limits.');
    }
    throw new Error(`GitHub API Error: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Fetch selected repository files for analysis.
 * Fetches the tree recursively, filters and sorts files, and grabs their content.
 */
export const fetchRepoFiles = async (owner, repo, defaultBranch) => {
  try {
    // Fetch repository tree recursively
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
    const response = await axios.get(treeUrl, { headers: getHeaders() });

    // Expressing structural trees
    const tree = response.data.tree;
    if (!tree || !Array.isArray(tree)) {
      throw new Error('Could not parse repository tree.');
    }

    // Filter files (exclude binary files, node_modules, locks, etc.)
    const codeFiles = [];
    const ignorePatterns = [
      /node_modules\//i,
      /\.git\//i,
      /\.github\//i,
      /venv\//i,
      /\.env(\..+)?$/i,
      /dist\//i,
      /build\//i,
      /\.next\//i,
      /\.nuxt\//i,
      /out\//i,
      /coverage\//i,
      /package-lock\.json$/i,
      /yarn\.lock$/i,
      /pnpm-lock\.yaml$/i,
      /bun\.lockb$/i,
      /\.(png|jpe?g|gif|webp|svg|ico|mp3|mp4|zip|tar|gz|pdf|woff2?|eot|ttf|otf)$/i,
      /\.map$/i,
      /\.min\.(js|css)$/i,
    ];

    const validExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java', '.cpp', '.c', '.h',
      '.cs', '.rb', '.php', '.rs', '.kt', '.swift', '.html', '.css', '.md',
      '.json', '.yml', '.yaml', '.txt', '.sh', '.mod', '.gradle', '.xml'
    ];

    for (const item of tree) {
      // We only care about files (blobs), not directories
      if (item.type !== 'blob') continue;

      // Skip files matching ignore patterns
      const shouldIgnore = ignorePatterns.some(pattern => pattern.test(item.path));
      if (shouldIgnore) continue;

      // Get extension and verify it's a code or documentation file
      const dotIndex = item.path.lastIndexOf('.');
      const ext = dotIndex !== -1 ? item.path.substring(dotIndex).toLowerCase() : '';

      // Keep files with valid code extensions, or manifest/config files (like package.json, requirements.txt)
      const baseName = item.path.split('/').pop().toLowerCase();
      const isCommonConfig = [
        'package.json', 'requirements.txt', 'go.mod', 'cargo.toml',
        'gemfile', 'composer.json', 'dockerfile', 'makefile', 'readme'
      ].includes(baseName);

      if (validExtensions.includes(ext) || isCommonConfig || baseName.startsWith('readme.')) {
        codeFiles.push({
          path: item.path,
          sha: item.sha,
          size: item.size || 0,
        });
      }
    }

    // Heuristically categorize and select files
    // 1. README
    const readmeFile = codeFiles.find(f => {
      const base = f.path.split('/').pop().toLowerCase();
      return base === 'readme.md' || base === 'readme.txt' || base === 'readme';
    });

    // 2. Main Entry Points
    const entryPoints = codeFiles.filter(f => {
      const base = f.path.split('/').pop().toLowerCase();
      return ['server.js', 'index.js', 'app.js', 'main.py', 'app.py', 'main.go', 'index.html'].includes(base);
    });

    // 3. Configurations / Manifests
    const configFiles = codeFiles.filter(f => {
      const base = f.path.split('/').pop().toLowerCase();
      return ['package.json', 'requirements.txt', 'go.mod', 'cargo.toml', 'gemfile', 'composer.json'].includes(base);
    });

    // 4. Source Files (excluding entry and config and readme)
    const sourceFiles = codeFiles.filter(f => {
      if (readmeFile && f.path === readmeFile.path) return false;
      if (entryPoints.some(e => e.path === f.path)) return false;
      if (configFiles.some(c => c.path === f.path)) return false;
      return true;
    });

    // Sort source files by size (descending) to find the most "central" files
    sourceFiles.sort((a, b) => b.size - a.size);

    // Assemble file list for AI review
    const selectedFiles = [];

    if (readmeFile) selectedFiles.push(readmeFile);

    // Add up to 2 configs
    configFiles.slice(0, 2).forEach(f => selectedFiles.push(f));

    // Add entry points
    entryPoints.slice(0, 2).forEach(f => selectedFiles.push(f));

    // Fill the rest with the largest source files up to total limit of 10 files
    const remainingSlots = 10 - selectedFiles.length;
    if (remainingSlots > 0) {
      sourceFiles.slice(0, remainingSlots).forEach(f => selectedFiles.push(f));
    }

    // Now, fetch content for each selected file
    const analyzedFiles = [];
    const contents = [];

    for (const file of selectedFiles) {
      try {
        // Fetch contents using GitHub git blob API (gives us base64, which is very reliable)
        const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${file.sha}`;
        const blobResponse = await axios.get(blobUrl, { headers: getHeaders() });

        let textContent = '';
        if (blobResponse.data.encoding === 'base64') {
          textContent = Buffer.from(blobResponse.data.content, 'base64').toString('utf-8');
        } else {
          textContent = blobResponse.data.content || '';
        }

        // Cap individual file size to send to AI (approx 25,000 characters or ~25KB)
        const isTruncated = textContent.length > 25000;
        const finalContent = isTruncated ? textContent.substring(0, 25000) + '\n... [FILE TRUNCATED FOR TOKEN EFFICIENCY] ...' : textContent;

        contents.push({
          path: file.path,
          content: finalContent,
          isTruncated,
        });

        analyzedFiles.push(file.path);
      } catch (fileError) {
        console.warn(`Failed to fetch file content for ${file.path}:`, fileError.message);
        // Continue fetching other files instead of crashing completely
      }
    }

    return {
      contents,
      analyzedFiles,
    };
  } catch (error) {
    console.error('Error fetching repo files:', error.response?.data || error.message);
    const status = error.response?.status;
    if (status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
      throw new Error('GitHub API rate limit exceeded during file fetch. Try adding a GITHUB_TOKEN.');
    }
    throw new Error(`GitHub File Fetch Error: ${error.message}`);
  }
};

/**
 * Fetch contents of a file or directory at a specific path
 */
export const fetchGitHubContents = async (owner, repo, path = '') => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await axios.get(url, { headers: getHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error fetching GitHub contents for ${owner}/${repo}/${path}:`, error.response?.data || error.message);
    const status = error.response?.status;
    if (status === 404) {
      throw new Error(`Path "${path}" not found in repository.`);
    } else if (status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
      throw new Error('GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase limits.');
    }
    throw new Error(`GitHub API Error: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Fetch contents of multiple files in parallel for chat context
 */
export const fetchMultipleFiles = async (owner, repo, paths) => {
  if (!paths || !Array.isArray(paths)) return [];

  const promises = paths.map(async (path) => {
    try {
      const fileData = await fetchGitHubContents(owner, repo, path);
      if (fileData && fileData.type === 'file') {
        let textContent = '';
        if (fileData.encoding === 'base64') {
          textContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        } else {
          textContent = fileData.content || '';
        }

        // Cap individual file size to send to AI (approx 25KB)
        const finalContent = textContent.length > 25000
          ? textContent.substring(0, 25000) + '\n... [FILE TRUNCATED FOR TOKEN EFFICIENCY] ...'
          : textContent;

        return {
          path,
          content: finalContent,
        };
      }
    } catch (err) {
      console.warn(`Failed to fetch file content for chat context: ${path}`, err.message);
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
};
