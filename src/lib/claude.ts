import type { QuizQuestion } from '@/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

export async function generateQuiz(videoTitle: string, videoDescription: string = ''): Promise<QuizQuestion[]> {
  try {
    const prompt = `Generate a 12-question multiple choice quiz based on this video title.

Video Title: ${videoTitle}
${videoDescription ? `Video Description: ${videoDescription}` : ''}

Create questions that test understanding of key concepts covered in this video.

Return ONLY a JSON array in this exact format (no markdown, no explanation, raw JSON only):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]

Make sure:
1. Questions are specific and relevant to "${videoTitle}"
2. Each question has exactly 4 options
3. correctAnswer is the index (0-3) of the correct option
4. The JSON is valid and parseable`;

    const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini quiz error:', JSON.stringify(errorData));
      throw new Error('Failed to generate quiz');
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid quiz format received');

    const questions: QuizQuestion[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(questions) || questions.length !== 12) {
      throw new Error('Invalid number of questions');
    }

    questions.forEach((q, i) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctAnswer !== 'number') {
        throw new Error(`Invalid question format at index ${i}`);
      }
    });

    return questions;
  } catch (error) {
    console.error('Error generating quiz:', error);
    return getFallbackQuiz(videoTitle);
  }
}

function getFallbackQuiz(title: string): QuizQuestion[] {
  return [
    {
      question: `What is the main topic covered in "${title}"?`,
      options: [
        'Understanding core concepts and fundamentals',
        'Advanced techniques and best practices',
        'Implementation details and examples',
        'All of the above',
      ],
      correctAnswer: 3,
    },
    {
      question: 'Which of the following is most important when learning this topic?',
      options: [
        'Memorizing syntax',
        'Understanding the underlying concepts',
        'Copying code examples',
        'Skipping to advanced topics',
      ],
      correctAnswer: 1,
    },
    {
      question: 'What approach is recommended for practicing what you learn?',
      options: [
        'Only watch videos without coding',
        'Build small projects and experiments',
        'Read documentation only',
        'Skip practice and move to next topic',
      ],
      correctAnswer: 1,
    },
    {
      question: 'When should you review the material?',
      options: [
        'Only once while watching',
        'After completing the entire course',
        'Regularly and when applying concepts',
        'Never, once is enough',
      ],
      correctAnswer: 2,
    },
    {
      question: 'What is the best way to reinforce learning?',
      options: [
        'Take notes and apply concepts',
        'Just watch passively',
        'Skip difficult parts',
        'Watch at 2x speed always',
      ],
      correctAnswer: 0,
    },
  ];
}