import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import ollama from 'ollama';
import { HuggingFaceConfig, OllamaConfig, OpenAIConfig } from './configuration';

const execAsync = promisify(exec);

export interface QueryStatus {
    isQuerying: boolean;
    elapsedTime: number;
}

export class LLMService {
    private config: any;
    private openAIClient?: OpenAI;

    constructor() {
        this.config = vscode.workspace.getConfiguration("LLM");
        if (!this.config) {
            console.error('Failed to load configuration');
        }
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

    private extractOllamaConfig(modalConfig: any): [boolean, OllamaConfig] {
        const config: OllamaConfig = {
            modelName: modalConfig.ollama.modelName,
            runLocalModel: modalConfig.ollama.runLocalModel
        };

        const isValid = !!(config.runLocalModel && config.modelName );
        return [isValid, config];
    }

    public async queryLLMModelAsync(pythonCode: string): Promise<any> {
   
        const [isValid, openAIConfig] = this.extractOpenAIConfig(this.config);
        if (isValid) {
            const prompt = this.generateRemoteModelPrompt(pythonCode);
            return this.generatePythonCommentsWithOpenAI(prompt, openAIConfig);
           
        }

        const [isValidHug, huggingFaceConfig] = this.extractHuggingFaceConfig(this.config);
        if (isValidHug) {
            const prompt = this.generateRemoteModelPrompt(pythonCode);
            return this.generatePythonCommentsWithHuggingFace(prompt, huggingFaceConfig);
        }

        const [isValidOllama, ollamaConfig] = this.extractOllamaConfig(this.config);
        if (isValidOllama) {
            const prompt = this.generateLocalModelOllamaPrompt(pythonCode, ollamaConfig.modelName);
            return this.generatePythonCommentsWithLocalLLMModel(prompt, ollamaConfig);
        }
        
        throw new Error('Invalid configuration');
    }
    private generateRemoteModelPrompt(pythonCode: string): string {
        const prompt = `Given this Python code:
        "${pythonCode}"
         ${this.basePrompt()}`;
        return prompt;
    }

    private generatePromptOld(pythonCode: string): string {
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

    private async generatePythonCommentsWithHuggingFace(prompt: string, config: HuggingFaceConfig): Promise<any> {

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
                        max_new_tokens: config.max_new_tokens
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const jsonResponse = await response.json();
            const res = jsonResponse[0]?.generated_text || '';

            const lastMatch = this.extractPythonCodeFromResponse(res);

            return lastMatch;

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            console.error('Failed to query model:', error);
            throw error;
        }
    }

    private async generatePythonCommentsWithLocalLLMModel(prompt: string, localLLMConfig: OllamaConfig): Promise<string> {
        try {
            const ollamaRes = await ollama.generate({
                model: localLLMConfig.modelName,
                prompt: prompt,
            });
            const result = ollamaRes.response || '';

            const lastMatch = this.extractPythonCodeFromResponse(result);

            return lastMatch;

        } catch (error) {
 
            // If query fails, try to start the model
            if (error instanceof Error && error.message.includes('fetch failed')) {
                console.error(`"Model is not running, Starting the model: ${localLLMConfig.modelName} ...`, error);
            await this.startLocalModel(localLLMConfig.modelName);

            // Retry the query after starting the model
            return await this.queryLocalModel(prompt, localLLMConfig);

            } else {
                if (error instanceof Error) {
                    throw new Error(error.message);
                } else {
                    throw new Error('Unknown error');
                }
            }
        }
    }

    private async queryLocalModel(prompt: string, localLLMConfig: OllamaConfig): Promise<string> {

        try {
            const ollamaRes = await ollama.generate({
                model: localLLMConfig.modelName,
                prompt: prompt,
            });
            const result = ollamaRes.response || '';

            const lastMatch = this.extractPythonCodeFromResponse(result);

            return lastMatch;

        } catch (error) {
            console.error("Starting Model:", error);
            // If query fails, try to start the model
            await this.startLocalModel(localLLMConfig.modelName);

            // Retry the query after starting the model
            return await this.queryLocalModel(prompt, localLLMConfig);

        }
    }
    private extractPythonCodeFromResponse(result: string): string {
        const regex = /```python\s*([\s\S]*?)\s*```/g;
        let match;
        let lastMatch = '';

        while ((match = regex.exec(result)) !== null) {
            lastMatch = match[1].trim();
        }
        return lastMatch;
    }

    private generateLocalModelOllamaPrompt(pythonCode: string, modelName: string): string {
        if (modelName.includes("qwen")) {
            return this.generateQwenPrompt(pythonCode);
        } else if (modelName.includes("codellama")) {
            return this.generateCodeLlamaPrompt(pythonCode);
        } else {
            throw new Error(`Model ${modelName} is not supported`);
        }
    }

    private generateQwenPrompt(pythonCode: string): string {
        return `<|im_start|>system\n${this.basePrompt()}<|im_end|>\n<|im_start|>user\n${pythonCode}<|im_end|><|im_start|>assistant`;
    }

    private generateCodeLlamaPrompt(pythonCode: string): string {
        return `[INST] <<SYS>>\n${this.basePrompt()}\n<</SYS>>\n\n${pythonCode}[/INST]`;
    }

    private basePrompt(): string {
        const basePrompt =
    `Generate a comment or docstring or inline code depending on the python code:
    You are an expert Python developer tasked with improving code readability by generating comments. Based on the given code snippet, produce one of the following:
    Inline Comment: Add brief explanations directly above or beside key lines of code.
    Block Comment: Provide a high-level summary at the start of a code block or function.
    Docstring: Write a detailed docstring (in triple quotes) for a function or class, following PEP 257 or PEP 8 standards.
    Just extend the code with the comment or docstring or inline code.
    `;
        return basePrompt;
    }

    private async startLocalModel(modelName: string): Promise<void> {
        try {
            const command = `ollama run ${modelName}`;
            await execAsync(command);
        } catch (error) {
            console.error('Error starting local LLM model:', error);
            throw new Error('Failed to start local LLM model');
        }
    }
    
}

