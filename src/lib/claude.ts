import type { QuizQuestion } from '@/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

export async function generateQuiz(videoTitle: string, videoDescription: string = ''): Promise<QuizQuestion[]> {
  try {
    const prompt = `Generate a 12-question multiple choice quiz based on this video title.

Video Title: ${videoTitle}
${videoDescription ? `Video Description: ${videoDescription}` : ''}

Create questions that test understanding of key concepts covered in this video.

Return ONLY a raw JSON array. No markdown, no code blocks, no backticks, no explanation. Start directly with [ and end with ]:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]

Make sure:
1. Generate exactly 12 questions
2. Questions are specific and relevant to "${videoTitle}"
3. Each question has exactly 4 options
4. correctAnswer is the index (0-3) of the correct option
5. The JSON is valid and parseable
6. No markdown, no backticks, no code blocks — raw JSON only`;

    const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 3000 },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini quiz error:', JSON.stringify(errorData));
      throw new Error('Failed to generate quiz');
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Robust JSON extraction
    let jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      const cleaned = content.replace(/```json|```/g, '').trim();
      jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    }
    if (!jsonMatch) throw new Error('Invalid quiz format received');

    const questions: QuizQuestion[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(questions) || questions.length === 0) {
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
      options: ['Understanding core concepts', 'Advanced techniques', 'Implementation details', 'All of the above'],
      correctAnswer: 3,
    },
    {
      question: 'Which approach is most important when learning this topic?',
      options: ['Memorizing syntax', 'Understanding underlying concepts', 'Copying code examples', 'Skipping to advanced topics'],
      correctAnswer: 1,
    },
    {
      question: 'What is the recommended way to practice what you learn?',
      options: ['Only watch videos', 'Build small projects', 'Read documentation only', 'Skip practice'],
      correctAnswer: 1,
    },
    {
      question: 'When should you review the material?',
      options: ['Only once while watching', 'After completing the course', 'Regularly when applying concepts', 'Never'],
      correctAnswer: 2,
    },
    {
      question: 'What is the best way to reinforce learning?',
      options: ['Take notes and apply concepts', 'Watch passively', 'Skip difficult parts', 'Watch at 2x always'],
      correctAnswer: 0,
    },
    {
      question: 'How should you approach difficult concepts?',
      options: ['Skip them entirely', 'Break them into smaller parts', 'Memorize without understanding', 'Move to next topic'],
      correctAnswer: 1,
    },
    {
      question: 'What makes a learning session most effective?',
      options: ['Watching as many videos as possible', 'Active engagement and note taking', 'Passive consumption', 'Speed watching'],
      correctAnswer: 1,
    },
    {
      question: 'How often should you test your knowledge?',
      options: ['Never', 'Only at the end', 'Regularly throughout learning', 'Once per week'],
      correctAnswer: 2,
    },
    {
      question: 'What is spaced repetition useful for?',
      options: ['Watching videos faster', 'Long term memory retention', 'Skipping content', 'Taking fewer notes'],
      correctAnswer: 1,
    },
    {
      question: 'What should you do after finishing a video?',
      options: ['Immediately watch the next one', 'Summarize what you learned', 'Close the app', 'Delete your notes'],
      correctAnswer: 1,
    },
    {
      question: 'How does teaching others help you learn?',
      options: ['It does not help', 'Reinforces your own understanding', 'Makes learning slower', 'Only helps the other person'],
      correctAnswer: 1,
    },
    {
      question: 'What is the most important factor in learning success?',
      options: ['Natural talent', 'Consistency and practice', 'Expensive courses', 'Watching at high speed'],
      correctAnswer: 1,
    },
  ];
}