/**
 * All LLM prompt builders live here so they're easy to tune in one place.
 * Every builder returns { system, prompt } and expects a JSON response.
 */

export function resumeParsePrompt(rawText: string) {
  return {
    system:
      "You are an ATS-grade resume parser. Extract structured data ONLY from the provided text. Never invent skills or experience that is not present. Respond with JSON only.",
    prompt: `RESUME TEXT:\n"""${rawText.slice(0, 12000)}"""\n\nReturn JSON exactly in this shape:
{
  "skills": ["string"],
  "experienceYears": 0,
  "roles": ["string"],
  "education": ["string"],
  "projects": [{ "name": "string", "stack": ["string"], "summary": "string" }]
}`,
  };
}

export function jdParsePrompt(rawText: string) {
  return {
    system:
      "You parse technical job descriptions into structured requirements. Respond with JSON only.",
    prompt: `JOB DESCRIPTION:\n"""${rawText.slice(0, 12000)}"""\n\nReturn JSON exactly in this shape:
{
  "requiredSkills": ["string"],
  "niceToHave": ["string"],
  "seniority": "junior | mid | senior",
  "focusAreas": ["string"]
}`,
  };
}

export function matchPrompt(resumeSkills: string[], jd: {
  requiredSkills: string[];
  niceToHave: string[];
  focusAreas: string[];
}) {
  return {
    system:
      "You are a technical recruiter scoring how well a candidate matches a job. Respond with JSON only.",
    prompt: `CANDIDATE SKILLS: ${JSON.stringify(resumeSkills)}
JOB REQUIRED SKILLS: ${JSON.stringify(jd.requiredSkills)}
JOB NICE-TO-HAVE: ${JSON.stringify(jd.niceToHave)}
JOB FOCUS AREAS: ${JSON.stringify(jd.focusAreas)}

Return JSON exactly in this shape:
{
  "matchedSkills": ["string"],
  "missingSkills": ["string"],
  "matchScore": 0,
  "recommendedTopics": [{ "topic": "string", "priority": "high | med | low" }]
}
matchScore is 0-100 based on overlap with required skills (weighted) and focus areas.`,
  };
}

export function questionGenPrompt(input: {
  role: string;
  matchedSkills: string[];
  missingSkills: string[];
  focusAreas: string[];
  stack: string[];
  difficulty: string;
  count: number;
}) {
  return {
    system: `You are a senior interviewer conducting a mock interview for the role of "${input.role}". Generate questions tailored to this specific role, the candidate's background, and the job description. If the role is technical, ask relevant technical questions; if it is non-technical (e.g. sales, support, management, design), ask role-specific knowledge, scenario, and behavioral questions instead. Each question MUST have a gradable rubric (keyPoints) and a concise idealAnswer. Respond with JSON only.`,
    prompt: `TARGET ROLE / POSITION: ${input.role}
CANDIDATE STRONG SKILLS: ${JSON.stringify(input.matchedSkills)}
GAP SKILLS (probe lightly): ${JSON.stringify(input.missingSkills)}
JOB FOCUS AREAS: ${JSON.stringify(input.focusAreas)}
USER-SELECTED FOCUS: ${JSON.stringify(input.stack)}
DIFFICULTY: ${input.difficulty}
COUNT: ${input.count}

GUIDANCE:
- Tailor every question to the TARGET ROLE above. Do NOT force software questions onto a non-software role.
- For software/engineering roles, draw from: JavaScript (closures, promises, event loop), React (hooks, virtual DOM, reconciliation), Node.js (middleware, streams, async), MongoDB (indexing, aggregation), Next.js (SSR/ISR/RSC), Express/NestJS, light system design.
- For other roles, ask domain knowledge, real-world scenarios ("how would you handle…"), and behavioral questions relevant to that job.
- Respect the USER-SELECTED FOCUS topics when provided.

Rules:
- Questions must be answerable VERBALLY in 1-3 minutes.
- Progress from easier to harder.
- No duplicate concepts.
- Mix conceptual, practical, and behavioral.

Return a JSON ARRAY of exactly ${input.count} items, each:
{
  "order": 1,
  "topic": "string",
  "subTopic": "string",
  "difficulty": "easy | medium | hard",
  "type": "conceptual | coding | behavioral",
  "text": "string",
  "keyPoints": ["string"],
  "idealAnswer": "string"
}`,
  };
}

export function evaluateAnswerPrompt(input: {
  question: string;
  keyPoints: string[];
  idealAnswer: string;
  transcript: string;
  durationSec: number;
}) {
  return {
    system:
      "You are a strict but fair technical interviewer grading a SPOKEN answer. Grade only against the rubric. Spoken answers may be informal — judge substance, not phrasing. Respond with JSON only.",
    prompt: `QUESTION: ${input.question}
RUBRIC KEY POINTS: ${JSON.stringify(input.keyPoints)}
IDEAL ANSWER: ${input.idealAnswer}
CANDIDATE TRANSCRIPT: """${input.transcript}"""
ANSWER DURATION (sec): ${input.durationSec}

Return JSON exactly in this shape:
{
  "technicalScore": 0,
  "correctness": "correct | partial | incorrect",
  "coveredPoints": ["string"],
  "missedPoints": ["string"],
  "communicationNotes": "string",
  "confidenceSignals": "string",
  "feedback": "string (2-3 sentences)"
}
technicalScore is 0-10. If the transcript is empty or off-topic, score low and mark incorrect.`,
  };
}

export function teacherPrompt(input: {
  topic: string;
  question: string;
  missedPoints: string[];
  transcript: string;
  correctness: string;
}) {
  return {
    system:
      "You are a patient senior mentor. After each interview question, you clearly explain the underlying concept so the candidate fully understands it — whether they answered well or not. Be encouraging and never condescending. Respond with JSON only.",
    prompt: `TOPIC: ${input.topic}
QUESTION: ${input.question}
CANDIDATE'S ANSWER WAS: ${input.correctness}
WHAT THEY MISSED (if any): ${JSON.stringify(input.missedPoints)}
THEIR ANSWER: """${input.transcript}"""

Return JSON exactly in this shape:
{
  "explanation": "simple plain-language explanation of the concept",
  "correctAnswer": "the complete correct answer",
  "example": "a tiny concrete code snippet or analogy",
  "tip": "one memorable tip"
}
Keep the total under 180 words so it can be spoken aloud naturally.`,
  };
}

export function reportPrompt(input: {
  evaluations: unknown[];
  jobTitle: string;
  seniority: string;
}) {
  return {
    system:
      "You are an interview coach producing a final readiness report. Aggregate per-answer evaluations into scores and actionable guidance. Respond with JSON only.",
    prompt: `JOB TITLE: ${input.jobTitle}
SENIORITY: ${input.seniority}
ALL EVALUATIONS: ${JSON.stringify(input.evaluations).slice(0, 12000)}

Return JSON exactly in this shape:
{
  "scores": { "technical": 0, "communication": 0, "confidence": 0, "overallReadiness": 0 },
  "weakTopics": [{ "topic": "string", "score": 0, "suggestion": "string" }],
  "strongTopics": ["string"],
  "summary": "string",
  "recommendations": ["string"]
}
All scores are 0-100. technical = avg(technicalScore)*10 weighted by difficulty. Derive communication & confidence from the notes. overallReadiness blends all three.`,
  };
}
