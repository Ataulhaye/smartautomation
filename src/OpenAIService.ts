import { OpenAI } from 'openai';

export class OpenAIService {
    private client?: OpenAI;
    private modelName?: string;
    private maxCompTokens: number;
    private temperature: number;

    constructor(config: any) {
        const apiKey = config.get('apiKey');
        const orgnization = config.get('organizationId');
        const modelName = config.get('modelName');
        this.maxCompTokens = config.get('max_completion_tokens') || 2048; // Default value if not set
        this.temperature = config.get('temperature') || 0.3; // Default value if not set

        this.initialize(apiKey, orgnization, modelName);
    }

    private initialize(apiKey: string, orgnization: string, modelName: string): void {
        if (!apiKey || !orgnization || !modelName) {
            throw new Error('OpenAI credentials are required in configuration');
        }
        this.client = new OpenAI({ apiKey: apiKey, organization: orgnization });
        this.modelName = modelName;
    }
    
    public async testConnection(): Promise<boolean> {
        if (!this.client || !this.modelName) {
            return false;
        }
        try {
            await this.generatePythonComments('def test(): pass');
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    public async generatePythonComments(pythonCode: string): Promise<string> {
        if (!this.client || !this.modelName) {
            throw new Error('OpenAI service not initialized');
        }

        try {
            const response = await this.client.chat.completions.create({
                model: this.modelName,
                messages: [
                    { 
                        role: "system", 
                        content: "You are an expert Python developer. Your task is to analyze Python code and provide clear, concise, and accurate docstring comments following PEP 257 conventions." 
                    },
                    { 
                        role: "user", 
                        content: `Please provide appropriate docstring comments for the following Python code:\n\n${pythonCode}` 
                    }
                ],
                temperature: this.temperature,
                //max_tokens: 2048,
                max_completion_tokens: this.maxCompTokens,
            });

            return response.choices[0]?.message?.content || '';
            
        } catch (error) {
            console.error('Error generating Python comments:', error);
            throw new Error(`Failed to generate comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
} 