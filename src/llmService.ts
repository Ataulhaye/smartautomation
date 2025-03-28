/*
 * Copyright (c) 2025 Ata Ul Haye.
 *
 * All rights reserved.
 *
 * This project, "Python Smart Automation" extension, including all associated source code,
 * documentation, and related files, is the intellectual property of Ata Ul Haye. You may
 * use, modify, and distribute this project in accordance with the terms of the MIT License.
 */

import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import ollama from 'ollama';
import { spawn } from 'child_process';
import { HuggingFaceConfig, OllamaConfig, OpenAIConfig } from './configuration';

export class LLMService {
    private openAIClient?: OpenAI;
    private isValidOpenAI: boolean;
    private openAIConfig: OpenAIConfig;
    private isValidHuggingFace: boolean;
    private huggingFaceConfig: HuggingFaceConfig;
    private isValidOllama: boolean;
    private ollamaConfig: OllamaConfig;

    constructor() {
        const lLM_Config = vscode.workspace.getConfiguration("LLM");
        if (!lLM_Config) {
            console.error('Failed to load configuration');
            vscode.window.showErrorMessage('Failed to load configuration, please check the configuration settings');
        }
        [this.isValidOpenAI, this.openAIConfig] = this.extractOpenAIConfig(lLM_Config);
        [this.isValidHuggingFace, this.huggingFaceConfig] = this.extractHuggingFaceConfig(lLM_Config);
        [this.isValidOllama, this.ollamaConfig] = this.extractOllamaConfig(lLM_Config);

        if (!this.isValidOpenAI && !this.isValidHuggingFace && !this.isValidOllama) {
            console.error('Invalid configuration');
            vscode.window.showErrorMessage('Invalid configuration, please check the configuration settings');
        }
    }

    private extractOpenAIConfig(modalConfig: any): [boolean, OpenAIConfig] {
        const openAIConfig: OpenAIConfig = {
            apiKey: modalConfig.openAI.apiKey,
            temperature: modalConfig.openAI.temperature,
            max_completion_tokens: modalConfig.openAI.max_completion_tokens,
            modelName: modalConfig.openAI.modelName,
            organizationId: modalConfig.openAI.organizationId
        };

        const isValidOpenAI = !!(openAIConfig.apiKey && openAIConfig.modelName && openAIConfig.organizationId);
        return [isValidOpenAI, openAIConfig];
    }

    private extractHuggingFaceConfig(modalConfig: any): [boolean, HuggingFaceConfig] {
        const huggingFaceConfig: HuggingFaceConfig = {
            apiKey: modalConfig.huggingFace.apiKey,
            endpoint: modalConfig.huggingFace.endpoint,
            temperature: modalConfig.huggingFace.temperature,
            max_new_tokens: modalConfig.huggingFace.max_new_tokens
        };
        const isValidHug = !!(huggingFaceConfig.apiKey && huggingFaceConfig.endpoint);
        return [isValidHug, huggingFaceConfig];
    }

    private extractOllamaConfig(modalConfig: any): [boolean, OllamaConfig] {
        const ollamaConfig: OllamaConfig = {
            modelName: modalConfig.ollama.modelName,
            runLocalModel: modalConfig.ollama.runLocalModel
        };

        const isValidOllama = !!(ollamaConfig.runLocalModel && ollamaConfig.modelName);
        return [isValidOllama, ollamaConfig];
    }

    public async queryLLMModelAsync(pythonCode: string): Promise<any> {

        if (this.isValidOpenAI) {
            const prompt = this.generateRemoteModelPrompt(pythonCode);
            return this.generatePythonCommentsWithOpenAI(prompt, this.openAIConfig);
        }

        if (this.isValidHuggingFace) {
            const prompt = this.generateRemoteModelPrompt(pythonCode);
            return this.generatePythonCommentsWithHuggingFace(prompt, this.huggingFaceConfig);
        }

        if (this.isValidOllama) {
            const prompt = this.generateLocalModelOllamaPrompt(pythonCode, this.ollamaConfig.modelName);
            return this.generatePythonCommentsWithLocalLLMModel(prompt, this.ollamaConfig);
        }

        vscode.window.showErrorMessage('Invalid configuration');
        throw new Error('Invalid configuration');
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
                max_completion_tokens: config.max_completion_tokens,
            });
            let res = response.choices[0]?.message?.content || '';
            return res.replace(/```python\s*|```/g, '').trim();

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                vscode.window.showErrorMessage(error.message);
                throw new Error('Request timed out');
            }
            console.error('Failed to query model:', error);
            throw error;
        }
    }

    private async generatePythonCommentsWithLocalLLMModel(prompt: string, localLLMConfig: OllamaConfig): Promise<string> {
        try {

            const res = await this.queryLocalModel(prompt, localLLMConfig);
            return res;

        } catch (error) {
            if (error instanceof Error && error.message.includes('fetch failed')) {

                vscode.window.showInformationMessage(`'Model is not running, Starting the model: ${localLLMConfig.modelName}.'`);

                //console.log(`"Model is not running, Starting the model: ${localLLMConfig.modelName} ...`);

                await this.startLocalModel(localLLMConfig.modelName);

                //console.log(`"Model: ${localLLMConfig.modelName} has been started successfully`);
                vscode.window.showInformationMessage(`'Model: ${localLLMConfig.modelName} has been started successfully'`);

                const res = await this.queryLocalModel(prompt, localLLMConfig);
                return res;

            } else {
                vscode.window.showErrorMessage(`Failed to generate comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
                throw new Error(`Failed to generate comments: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
            throw new Error(error instanceof Error ? error.message : String(error));
        }
    }
    private async startLocalModel(modelName: string): Promise<void> {
        const args = ['run', `${modelName}`];
        const command = 'ollama';
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, { stdio: 'inherit' });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command exited with code ${code}`));
                }
            });

            process.on('error', (err) => {
                reject(err);
            });
        });
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

    private basePrompt(): string {
        const basePrompt =
            `Generate a comment or docstring or inline code depending on the python code:
    You are an expert Python developer tasked with improving code readability by generating comments. Based on the given code snippet, produce one of the following:
    Inline Comment: Add brief explanations directly above or beside key lines of code.
    Block Comment: Provide a high-level summary at the start of a code block or function.
    Docstring: Write a detailed docstring (in triple quotes) for a function or class, following PEP 257 or PEP 8 standards.
    Just extend the code with the comment or docstring or inline code.
    Do not modify the code itself.
    If the code is already commented, you can provide a more detailed explanation or improve the existing comments.
    If the comment contains BUSINESS, TODO, FIXME, DONOTCHANGEME, PRESERVE, BUG, DEBUG, HACK, BODGE, KLUDGE, NOTE, UNDONE, or similar keywords, do not modify these comments.
    Do not delete lisence headers or copyright notices or code review comments.
    `;
        return basePrompt;
    }

    private generateRemoteModelPrompt(pythonCode: string): string {
        const prompt = `Given this Python code:
        "${pythonCode}"
         ${this.basePrompt()}`;
        return prompt;
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
}