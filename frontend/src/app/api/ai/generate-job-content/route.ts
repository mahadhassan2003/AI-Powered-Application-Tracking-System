import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { title, location, category, field } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const prompts: Record<string, string> = {
      description: `Write a compelling, professional job description for a "${title}" position${location ? ` based in ${location}` : ''}${category ? ` in the ${category} department` : ''}. 

Include: role overview, key responsibilities (5-7 bullet points), what makes this role exciting, and team culture.
Keep it under 300 words. Be specific and engaging. Do NOT include requirements or qualifications.
Output only the description text, no headers or labels.`,

      requirements: `Write professional job requirements/qualifications for a "${title}" position${category ? ` in ${category}` : ''}.

Include: required skills (5-7 bullet points), years of experience, education requirements, and nice-to-have skills.
Keep it under 200 words. Be specific and realistic.
Output only the requirements text, no headers or labels.`,
    };

    const prompt = prompts[field] || prompts.description;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a professional HR copywriter who creates compelling job postings for tech companies.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Groq API Error]', err);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('[AI Generate Error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
