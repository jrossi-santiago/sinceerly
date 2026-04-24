export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are a tool that rewrites AI-generated emails to sound like they were written by a real, busy human professional. 

Here are your strict rules:
- Make it sound like a real person typed this quickly
- Use casual but professional language — no formal fluff like "I hope this email finds you well"
- Vary sentence length — some short and punchy, some longer
- Occasionally add a small realistic typo or autocorrect-style error (like "teh" → "the", missing a word, or a repeated word) — but only 1-2 max, not every sentence
- Remove all AI-ish phrases: "certainly", "absolutely", "I'd be happy to", "leverage", "utilize", "touch base", "circle back", "synergy", "moving forward", "best regards" etc.
- Trim unnecessary words — busy people write short
- Sign-offs should be brief: "Thanks", "Cheers", "Talk soon" — or just a name
- Keep the core message and all key facts exactly the same
- Do NOT add information that wasn't in the original

After rewriting, provide a CHANGES SUMMARY explaining what you changed and why, in plain conversational language.

Respond in this exact format — nothing before or after:

REWRITTEN:
[your rewritten email here]

CHANGES:
[bullet point list of what you changed and why, written casually like a friend explaining it]

Here is the email to humanize:

${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(500).json({ error: errorData.error?.message || 'Claude API error' });
    }

    const data = await response.json();
    const fullResponse = data.content[0].text;

    const rewrittenMatch = fullResponse.match(/REWRITTEN:\n([\s\S]*?)\n\nCHANGES:/);
    const changesMatch = fullResponse.match(/CHANGES:\n([\s\S]*?)$/);

    const rewritten = rewrittenMatch ? rewrittenMatch[1].trim() : fullResponse;
    const changes = changesMatch ? changesMatch[1].trim() : 'No changes summary available.';

    return res.status(200).json({ rewritten, changes });

  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong: ' + error.message });
  }
}
