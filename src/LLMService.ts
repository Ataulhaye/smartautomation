import fetch from 'node-fetch';

export class LLMService {
  private readonly URL = 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct';
  private readonly API_KEY = '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';

  async generateComment(): Promise<string> {
    const response = await fetch(this.URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: "Generate an inline comment for a given code snippet in Python. The comment should be concise and informative. Only respond with the comment and nothing else. Always end the comment with a dot. The code snippet is as follows: return a + b",
        parameters: {
          max_new_tokens: 20,
          temperature: 1.0,
          top_k: 1,
        }
      })
    });

    if (!response.ok) {
      console.log('API request failed with status: ' + response.status);
    }

    const result = await response.json();

    const comment = result[0].generated_text;

    console.log('Generated comment: ' + comment);
    return comment;

  }


}