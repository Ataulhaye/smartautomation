import * as vscode from 'vscode';
import fetch from 'node-fetch';


export class ModalLoader {
    private config: any;

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        if (this.config) {
            return;
        }

        const config = vscode.workspace.getConfiguration('pythonAutoComment');
        if (!config) {
            throw new Error('Configuration for pythonAutoComment is not found.');
        }

        this.config = {
            model: {
                type: config.get('model.type'),
                endpoint: config.get('model.endpoint'),
                api_key: config.get('model.api_key'),
                model_name: config.get('model.modelName'),
                parameters: {
                    temperature: config.get('model.parameters.temperature'),
                    max_tokens: config.get('model.parameters.maxTokens')
                }
            },
            prompt_template: config.get('promptTemplate')
        };
    }
    
    public async queryModel(prompt: string): Promise<any> {

        try {
            const response = await fetch(this.config.model.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.model.api_key}`
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: this.config.model.parameters
            })
            });

            if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
            }

            const jsonResponse = await response.json();
            return jsonResponse;
        } catch (error) {
            console.error('Failed to query model:', error);
            throw error;
        }
    }
}