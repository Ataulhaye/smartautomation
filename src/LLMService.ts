import * as vscode from 'vscode';
import fetch from 'node-fetch';

export class LLMService {
    private readonly URL = 'http://localhost:11434/api/chat'; // Local LLM API endpoint
    private history: Array<{ role: string; content: string }> = []; // Conversation history

    async generateComment(prompt: string, code: string): Promise<string> {
        // System prompt describing the task
        const systemPrompt = `
You are an assistant that processes Python code. Your task is to:

- Add meaningful inline comments to explain the purpose of each part of the code.
- Add docstrings following Python's PEP 257 standards.
- Ensure the output is the complete code with added comments and docstrings.
- Do not change the logic of the code unless explicitly requested.

Here is the code to process:
${code}
`;

        // Add the system prompt and user prompt to the history
        this.history.push({ role: "system", content: systemPrompt });
        this.history.push({ role: "user", content: prompt });

        // Prepare the request payload
        const data = {
            model: "llama3.2-vision", // Specify the local model
            messages: this.history, // Include conversation history
            stream: false,
        };

        try {
            const response = await fetch(this.URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`API request failed with status code: ${response.status}`);
            }

            const result = await response.json();
            const reply = result.message.content;

            // Add the assistant's reply to the history
            this.history.push({ role: "assistant", content: reply });

            return reply;
        } catch (error) {
            throw new Error(`Failed to communicate with LLM: ${(error as Error).message}`);
        }
    }
}
