import { GoogleGenAI } from '@google/genai';

/**
 * Construct the prompt sent to Gemini.
 * Identical to our previous reviewer structure to maintain analysis features.
 */
export const buildAnalysisPrompt = (metadata, files) => {
  let fileContentPrompt = '';

  files.forEach(file => {
    fileContentPrompt += `\n--- START FILE: ${file.path} ---\n`;
    fileContentPrompt += file.content;
    fileContentPrompt += `\n--- END FILE: ${file.path} ---\n`;
  });

  return `You are a senior software engineer reviewing a student's GitHub repository for placement interviews.
Your goal is to produce analysis for "${metadata.name}" (written primarily in ${metadata.primaryLanguage}) that is technically accurate, easy for engineering students to understand, professional but not academic, and suitable for placement interview discussions.

Repository Metadata:
- Owner: ${metadata.owner}
- Description: ${metadata.description || 'No description provided.'}
- Primary Language: ${metadata.primaryLanguage}
- Stars: ${metadata.stars}
- Forks: ${metadata.forks}

Key File Contents:
${fileContentPrompt}

CRITICAL WRITING RULES:
1. Use simple, professional English in active voice. Avoid long paragraphs, research-paper language, or academic phrasing.
2. Avoid unnecessary software architecture jargon or advanced enterprise patterns unless strictly necessary.
3. If a technical term is necessary (e.g., JWT, Middleware, REST API, CORS, ORM, Validation, Dependency Injection), explain it briefly in the same sentence using simple words (e.g., "JWT authentication is used to verify users after login.").
4. Keep each point between 1 and 3 short sentences.
5. Prefer practical, actionable advice over theoretical explanations. Write as if mentoring a junior software developer. Focus on improvements that a final-year engineering student can realistically implement.
6. Do not recommend technologies that are not already relevant to the repository unless they provide significant, immediate value.
7. Avoid buzzwords like: architectural decomposition, excessive coupling, abstraction layer, orchestration, cohesion, polymorphic behavior, heuristic analysis, enterprise-grade, unless absolutely required.
8. Instead of naming a problem only, explain why it matters (e.g., instead of "Tight coupling to Axios", write "API calls are written directly inside React components. Moving them to a separate service file will make the code easier to maintain and reuse.").
9. Never assume the reader is an experienced backend engineer.
10. Make recommendations sound actionable (e.g., instead of "Improve modularity", write "Separate routes, controllers, and services into different files. This makes the project easier to understand and maintain.").
11. In the 'keyFindings' array, list 4 to 6 specific strengths ('success') or weaknesses ('warning') based on actual scanned files.
12. Preserve the existing JSON response format exactly.`;
};

/**
 * Send repo metadata and selected files to Gemini to run the code quality review.
 * Enforces structured JSON output via responseSchema config.
 */
export const analyzeRepository = async (metadata, files) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your env environment.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildAnalysisPrompt(metadata, files);

  try {
    // Default to stable gemini-3.5-flash for the free tier
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

    console.log(`Sending analysis request to Gemini using model: ${modelName}`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'integer',
              description: 'Overall code quality score from 1 (terrible) to 10 (perfect codebase).',
            },
            scoreJustification: {
              type: 'string',
              description: 'A concise 1 to 2 sentence summary explaining the overall score in simple, student-friendly terms. Must be under 150 characters.',
            },
            keyFindings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['success', 'warning'],
                    description: 'Whether this finding is a positive highlight (success) or a weakness/improvement area (warning).',
                  },
                  finding: {
                    type: 'string',
                    description: 'A 3 to 6 word specific, non-generic finding based on the code using simple terms.',
                  },
                },
                required: ['type', 'finding'],
              },
              description: 'List of 4 to 6 key strengths or weaknesses explained simply and practical for interviews.',
            },
            summary: {
              type: 'string',
              description: 'A concise summary (1-3 short sentences) of what the application does, written simply for software engineering students.',
            },
            structureAssessment: {
              type: 'string',
              description: 'Evaluation of project folder organization in 1-3 short, clear sentences. Explain why structural choices matter in simple terms.',
            },
            bestPractices: {
              type: 'object',
              properties: {
                namingConventions: {
                  type: 'string',
                  description: 'Assessment of variable, function, and file naming in 1-3 simple sentences.',
                },
                errorHandling: {
                  type: 'string',
                  description: 'Assessment of try-catch blocks and crash prevention in 1-3 simple sentences explaining why it matters.',
                },
                securityRedFlags: {
                  type: 'string',
                  description: 'Check for hardcoded passwords/keys and security risks in 1-3 simple sentences.',
                },
                missingTestsOrDocs: {
                  type: 'string',
                  description: 'Evaluation of documentation and automated test suites in 1-3 simple sentences.',
                },
              },
              required: ['namingConventions', 'errorHandling', 'securityRedFlags', 'missingTestsOrDocs'],
            },
            actionableSuggestions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: '3 to 5 practical, interview-ready recommendations (1-3 short sentences each) explaining what to improve, why it matters, and how to fix it.',
            },
          },
          required: ['score', 'scoreJustification', 'keyFindings', 'summary', 'structureAssessment', 'bestPractices', 'actionableSuggestions'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Gemini API did not return text content.');
    }

    // Parse structured JSON response
    const parsedData = JSON.parse(response.text);
    return parsedData;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Gemini Analysis failed: ${error.message}`);
  }
};

/**
 * Construct the prompt sent to Gemini for codebase chat queries
 */
export const buildChatPrompt = (analysis, fileContents, newQuestion) => {
  let fileContentPrompt = '';

  if (fileContents && fileContents.length > 0) {
    fileContents.forEach(file => {
      fileContentPrompt += `\n--- START FILE: ${file.path} ---\n`;
      fileContentPrompt += file.content;
      fileContentPrompt += `\n--- END FILE: ${file.path} ---\n`;
    });
  } else {
    fileContentPrompt = '\n(No relevant source file contents were found or retrieved.)\n';
  }

  // Cap chat history context to the last 6 messages (e.g. 3 turns) for token efficiency
  const maxHistoryMessages = 6;
  const recentHistory = (analysis.chatHistory || []).slice(-maxHistoryMessages);

  let historyPrompt = '';
  if (recentHistory.length > 0) {
    historyPrompt = '\nHere is the recent conversation history:\n';
    recentHistory.forEach(msg => {
      const speaker = msg.role === 'user' ? 'User' : 'Assistant';
      historyPrompt += `${speaker}: ${msg.message}\n`;
    });
  }

  return `You are a senior software engineer mentoring a student on their repository "${analysis.repoMetadata.name}".

Repository Metadata:
- Name: ${analysis.repoMetadata.name}
- Owner: ${analysis.repoMetadata.owner}
- Primary Language: ${analysis.repoMetadata.primaryLanguage}

Key Files Context:
${fileContentPrompt}
${historyPrompt}
New Question:
User: ${newQuestion}

WRITING RULES:
1. Use simple, professional English in active voice suitable for placement interviews.
2. Avoid unnecessary software architecture jargon, research-paper language, or advanced enterprise patterns unless strictly necessary.
3. If a technical term is necessary (e.g., Middleware, ORM, REST API, CORS), explain it briefly in the same sentence using simple words.
4. Keep each point between 1 and 3 short sentences.
5. Focus on improvements that a final-year engineering student can realistically implement. Do not recommend irrelevant technologies unless they provide significant value.
6. Explain why issues matter and make recommendations actionable (explain what to change and why).
7. Respond in markdown format.`;
};

/**
 * Query Gemini model with the codebase chat prompt
 */
export const generateChatAnswer = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your env environment.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  try {
    console.log(`Sending codebase Q&A request to Gemini using model: ${modelName}`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    if (!response.text) {
      throw new Error('Gemini API did not return text content.');
    }

    return response.text;
  } catch (error) {
    console.error('Gemini Chat API Error:', error);
    throw new Error(`Gemini Chat failed: ${error.message}`);
  }
};
