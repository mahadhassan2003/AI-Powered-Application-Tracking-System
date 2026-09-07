import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { jobTitle, candidateName } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const prompt = `You are an expert technical recruiter and hiring manager.
Create a list of 5 deeply technical, behavioral, and situational interview questions specifically tailored for a candidate named "${candidateName}" who is interviewing for the position of "${jobTitle}". 
Format the response cleanly using Markdown with 1-2 bullet points of "what to look for" under each question. No intro or outro texts.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ 
        content: data.choices[0].message.content 
    });

  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
  }
}
