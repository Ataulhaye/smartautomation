import ollama from 'ollama';

// Select a model and its corresponding prompt
// const selectedPrompt: string = systemPrompts[selectedModel];

export async function generateDocumentation(userCode: string, model: string): Promise<string> {

    const prompt = generateFullPrompt(userCode, model);

    try {
        const response = await ollama.generate({
            model: model,
            prompt: prompt,
        });

        // Extract assistant's response
        const documentedCode = response.response;

        console.log(`Model: ${model}\nPrompt: ${prompt}\n\nResponse:\n${documentedCode}\n\n\n\n`);

        return documentedCode;
    } catch (error) {
        console.error("Error during documentation generation:", error);
        throw error;
    }
}

const basePrompt = `
You are a helpful assistant tasked with documenting code. Your goal is to add comments and docstrings to the given code without altering the code itself in any way.

Guidelines:
1. Only add comments and docstrings to explain the code.
2. Do not modify the original code structure, logic, or functionality.
3. Respond only with the fully documented code, and include no explanations, headers, or additional text.
`;

function generateFullPrompt(userCode: string, model: string): string {
    switch (model) {
        case "qwen2.5-coder:0.5b":
        case "qwen2.5-coder:1.5b":
        case "qwen2.5-coder:3b":
        case "qwen2.5-coder:7b":
        case "qwen2.5-coder:14b":
        case "qwen2.5-coder:32b":
            return generateQwenPrompt(userCode);
        case "codellama":
        case "codellama:7b":
        case "codellama:13b":
        case "codellama:34b":
        case "codellama:70b":
            return generateCodeLlamaPrompt(userCode);
        default:
            throw new Error(`Model ${model} is not supported`);
    }
}

function generateQwenPrompt(userCode: string): string {
    return `<|im_start|>system\n${basePrompt}<|im_end|>\n<|im_start|>user\n${userCode}<|im_end|><|im_start|>assistant`;
}

function generateCodeLlamaPrompt(userCode: string): string {
    return `[INST] <<SYS>>\n${basePrompt}\n<</SYS>>\n\n${userCode}[/INST]`;
}