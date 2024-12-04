import fetch from 'node-fetch';


export class LLMService {
    private config: any;

    constructor(modalConfig: any) {
        this.config = modalConfig;
    }   
    
    public async queryModelAsync(prompt: string, timeout: number = 5000): Promise<any> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
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
            }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(`Error: ${response.statusText}, ${JSON.stringify(errorResponse)}`);
            }

            const jsonResponse = await response.json();
            return jsonResponse;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            //console.error('Failed to query model:', error);
            throw error;
        }
    }
}