import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import { HuggingFaceConfig, OpenAIConfig } from './configuration';

export interface QueryStatus {
    isQuerying: boolean;
    elapsedTime: number;
}

export class LLMService {
    private config: any;
    private openAIClient?: OpenAI;
    private statusCallback: (status: QueryStatus) => void;

    constructor(onStatusUpdate: (status: QueryStatus) => void) {
        this.config = vscode.workspace.getConfiguration("LLM");
        if (!this.config) {
            console.error('Failed to load configuration');
        }
        this.statusCallback = onStatusUpdate;
    }
    private extractOpenAIConfig(modalConfig: any): [boolean, OpenAIConfig] {
        const config: OpenAIConfig = {
            apiKey: modalConfig.openAI.apiKey,
            temperature: modalConfig.openAI.temperature,
            max_completion_tokens: modalConfig.openAI.max_completion_tokens,
            modelName: modalConfig.openAI.modelName,
            organizationId: modalConfig.openAI.organizationId
        };

        const isValid = !!(config.apiKey && config.modelName && config.organizationId);
        return [isValid, config];
    }

    private extractHuggingFaceConfig(modalConfig: any): [boolean, HuggingFaceConfig]  {
        const config: HuggingFaceConfig =  {
            apiKey: modalConfig.huggingFace.apiKey,
            endpoint: modalConfig.huggingFace.endpoint,
            temperature: modalConfig.huggingFace.temperature,
            max_new_tokens: modalConfig.huggingFace.max_new_tokens
        };
        const isValid = !!(config.apiKey && config.endpoint);
        return [isValid, config];
    }
    public async queryLLMModelAsync(pythonCode: string): Promise<any> {

        const prompt = this.generatePrompt(pythonCode);

        const [isValid, openAIConfig] = this.extractOpenAIConfig(this.config);
        if (isValid) {
            return this.generatePythonCommentsWithOpenAI(prompt, openAIConfig);
           
        }

        const [isValidHug, huggingFaceConfig] = this.extractHuggingFaceConfig(this.config);
        if (isValidHug) {
            return this.generatePythonCommentsWithHuggingFace(prompt, huggingFaceConfig);
        }

        throw new Error('Invalid configuration');
    }

    private generatePrompt(pythonCode: string): string {
        const prompt = `Given this Python code:
        "${pythonCode}"
        Generate a comment or docstring or inline code depending on the python code:
        You are an expert Python developer tasked with improving code readability by generating comments. Based on the given code snippet, produce one of the following:
        Inline Comment: Add brief explanations directly above or beside key lines of code.
        Block Comment: Provide a high-level summary at the start of a code block or function.
        Docstring: Write a detailed docstring (in triple quotes) for a function or class, following PEP 257 or PEP 8 standards.
        Just extend the code with the comment or docstring or inline code.
        `;
        return prompt;
    }

    private async generatePythonCommentsWithOpenAI(prompt: string, config: OpenAIConfig): Promise<string> {
        this.openAIClient = new OpenAI({ apiKey: config.apiKey, organization: config.organizationId });

        if (!this.openAIClient || !config.modelName) {
            throw new Error('OpenAI service not initialized');
        }

        try {
            const response = await this.openAIClient.chat.completions.create({
                model: config.modelName,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert Python developer. Your task is to analyze Python code and provide clear, concise, and accurate docstring comments following PEP 257 conventions."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: config.temperature,
                //max_tokens: 2048,
                max_completion_tokens: config.max_completion_tokens,
            });
            let res = response.choices[0]?.message?.content || '';
            return res.replace(/```python\s*|```/g, '').trim();
            //return response.choices[0]?.message?.content || '';

        } catch (error) {
            console.error('Error generating Python comments:', error);
            throw new Error(`Failed to generate comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async generatePythonCommentsWithHuggingFace(prompt: string, config: HuggingFaceConfig,timeout: number = 60000): Promise<any> {
        const startTime = Date.now();
        let timer: NodeJS.Timeout;

        this.statusCallback({ isQuerying: true, elapsedTime: 0 });
        timer = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            this.statusCallback({ isQuerying: true, elapsedTime });
        }, 1000);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        temperature: config.temperature,
                        max_tokens: config.max_new_tokens
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorResponse = await response.json();
                throw new Error(`Error: ${response.statusText}, ${JSON.stringify(errorResponse)}`);
            }

            const jsonResponse = await response.json();
            let res = jsonResponse[0]?.generated_text;
            const regex = /```python\s*([\s\S]*?)\s*```/g;
            let match;
            let lastMatch = '';

            while ((match = regex.exec(res)) !== null) {
                lastMatch = match[1].trim();
            }

            return lastMatch;

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            console.error('Failed to query model:', error);
            throw error;
        }
        finally {
            if (timer) {
                clearInterval(timer);
            }
            this.statusCallback({ isQuerying: false, elapsedTime: 0 });
        }
    }
}

