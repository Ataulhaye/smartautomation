export interface OpenAIConfig {
    apiKey: string;
    organizationId: string;
    modelName: string;
    max_completion_tokens: number;
    temperature: number;
}

export interface HuggingFaceConfig {
    max_new_tokens: number;
    endpoint: string;
    apiKey: string;
    temperature: number;
}

export interface OllamaConfig {
    modelName: string;
    runLocalModel: boolean;
}