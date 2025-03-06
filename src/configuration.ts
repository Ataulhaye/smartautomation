/*
 * Copyright (c) 2025 Ata Ul Haye.
 *
 * All rights reserved.
 *
 * This project, "Python Smart Automation" extension, including all associated source code,
 * documentation, and related files, is the intellectual property of Ata Ul Haye. You may
 * use, modify, and distribute this project in accordance with the terms of the MIT License.
 */

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