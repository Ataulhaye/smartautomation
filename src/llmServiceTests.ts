import { LLMService } from "./llmService";

  export class TestLLMService {
      private modalService:LLMService;

      constructor(modalConfig: any) {
          this.modalService = new LLMService(modalConfig, (status) => {
              console.log("Status update:", status);
          });
          this.test_dummy_prompt();
      }

      private async test_dummy_prompt() {
            const code = "def add_numbers(num1, num2): return num1 + num2";
            const prompt = `Given this Python code:
            "${code}"
            Write a brief, clear inline comment explaining what this line does. Format: # comment
            Keep it concise and technical.`;
        
            const response = await this.modalService.queryModelAsync(prompt);
            console.log(response[0].generated_text);
      }
  }  