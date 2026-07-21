import dotenv from 'dotenv';
import { parseGitHubUrl, fetchRepoMetadata, fetchRepoFiles } from './services/githubService.js';
import { analyzeRepository } from './services/geminiService.js';

dotenv.config();

const testRepo = process.argv[2] || 'https://github.com/octocat/Hello-World';

async function runTest() {
  console.log('=============================================');
  console.log(`Starting Integration Test for URL: ${testRepo}`);
  console.log('=============================================\n');

  // 1. Test URL Parsing
  console.log('Step 1: Parsing GitHub URL...');
  try {
    const parsed = parseGitHubUrl(testRepo);
    console.log('✅ URL Parsed successfully:', parsed);
    const { owner, repo } = parsed;

    // 2. Test Repo Metadata Fetching
    console.log('\nStep 2: Fetching Repository Metadata...');
    const metadata = await fetchRepoMetadata(owner, repo);
    console.log('✅ Metadata fetched successfully:');
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Owner: ${metadata.owner}`);
    console.log(`   Primary Lang: ${metadata.primaryLanguage}`);
    console.log(`   Stars: ${metadata.stars}`);
    console.log(`   Default Branch: ${metadata.defaultBranch}\n`);

    // 3. Test File Extraction Heuristic
    console.log('Step 3: Fetching and filtering repository files...');
    const filesData = await fetchRepoFiles(owner, repo, metadata.defaultBranch);
    console.log(`✅ Selected ${filesData.analyzedFiles.length} files for analysis:`);
    filesData.analyzedFiles.forEach((file, index) => {
      console.log(`   [${index + 1}] ${file}`);
    });
    console.log('');

    // 4. Test Gemini Analysis (Conditional on API Key availability)
    console.log('Step 4: AI Code Analysis Integration...');
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️  Skipping Gemini API Call: GEMINI_API_KEY is not configured in .env');
      console.log('👉 Add your GEMINI_API_KEY in backend/.env to test AI code reviews.');
      return;
    }

    console.log('Sending files and metadata to Gemini (this may take a few seconds)...');
    const analysis = await analyzeRepository(metadata, filesData.contents);
    console.log('✅ Gemini analysis succeeded! Structured JSON output received:');
    console.log('---------------------------------------------');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('---------------------------------------------');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

runTest();
