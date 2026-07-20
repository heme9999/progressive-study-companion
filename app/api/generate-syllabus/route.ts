export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not defined in Environment Variables." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const body = await request.json() as any;
    const { title, description } = body;
    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: "Book title and content/description are required." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const prompt = `You are an expert educator, curriculum designer, and academic tutor. 
I want you to design a highly engaging, structured, 5-stage progressive study course/syllabus based on the following book or topic:

Book Title: "${title}"
Content/Description: "${description}"

Guidelines:
1. Divide the book/content into exactly 5 logical, sequential, and progressive study milestones/chapters.
2. The progression must flow naturally from basic core concepts (Milestone 1) up to advanced mastery or deep interpretation (Milestone 5).
3. For each milestone:
   - Generate a clean, short, inspiring Title (e.g. "第一阶段：认识‘仁’的本意" or "Milestone 1: The Call of the Desert").
   - Write a rich, informative, and engaging Summary/Reading material (approx 200-300 words in Chinese/English based on the input text's language) that teaches the core message of this milestone. It must contain actual knowledge and depth, not just generic filler.
   - Define 2-4 Key Concepts/Vocabulary terms with elegant definitions.
   - Create exactly 3 distinct multiple choice questions with 4 options each, indicating the correct option index (0 to 3) and a detailed explanation of why the correct answer is right and others are wrong.
4. Ensure the output language matches the input language (use Chinese if input is Chinese, or English if input is English).`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        bookTitle: { type: "STRING", description: "The elegant title of the generated course" },
        description: { type: "STRING", description: "A high-quality 2-sentence summary introduction to this course." },
        milestones: {
          type: "ARRAY",
          description: "Exactly 5 sequential study milestones forming a progressive learning path",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Milestone title" },
              summary: { type: "STRING", description: "Engaging study material, core text, and summary for this milestone (approx. 200-300 words). Highly informative, clear, and comprehensive." },
              difficulty: { type: "STRING", description: "Difficulty level: 'Easy', 'Medium', or 'Hard'" },
              keyConcepts: {
                type: "ARRAY",
                description: "2-4 key vocabularies, core terms, or abstract concepts covered in this milestone",
                items: {
                  type: "OBJECT",
                  properties: {
                    term: { type: "STRING", description: "The core term or concept name" },
                    definition: { type: "STRING", description: "An elegant, easy-to-understand explanation of the term" }
                  },
                  required: ["term", "definition"]
                }
              },
              quizQuestions: {
                type: "ARRAY",
                description: "Exactly 3 distinct, high-quality multiple choice questions testing comprehension of this milestone's content",
                items: {
                  type: "OBJECT",
                  properties: {
                    question: { type: "STRING", description: "The quiz question" },
                    options: {
                      type: "ARRAY",
                      items: { type: "STRING" },
                      description: "Exactly 4 multiple choice options"
                    },
                    correctIndex: { type: "INTEGER", description: "Index of the correct option (0, 1, 2, or 3)" },
                    explanation: { type: "STRING", description: "Detailed explanation of why the correct option is right and others are incorrect" }
                  },
                  required: ["question", "options", "correctIndex", "explanation"]
                }
              }
            },
            required: ["title", "summary", "difficulty", "keyConcepts", "quizQuestions"]
          }
        }
      },
      required: ["bookTitle", "description", "milestones"]
    };

    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${errText}` }),
        { status: geminiRes.status, headers: { "content-type": "application/json" } }
      );
    }

    const data = await geminiRes.json() as any;
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return new Response(
        JSON.stringify({ error: "Failed to generate syllabus from Gemini." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(textResult, {
      headers: {
        "content-type": "application/json",
      }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "An error occurred." }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
