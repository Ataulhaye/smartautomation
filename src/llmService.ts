import fetch from 'node-fetch';

export interface QueryStatus {
    isQuerying: boolean;
    elapsedTime: number;
}

export class LLMService {
    private config: any;
    private statusCallback: (status: QueryStatus) => void;

    constructor(modalConfig: any, onStatusUpdate: (status: QueryStatus) => void) {
        this.config = modalConfig;
        this.statusCallback = onStatusUpdate;
    }

    public async queryModelAsync(prompt: string, timeout: number = 60000): Promise<any> {
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
        finally {
            if (timer) {
                clearInterval(timer);
            }
            this.statusCallback({ isQuerying: false, elapsedTime: 0 });
        }
    }
}