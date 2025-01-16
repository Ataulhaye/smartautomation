import { LLMService } from "./llmService";

  export class TestLLMService {
      private modelService:LLMService;

      constructor() {
          this.modelService = new LLMService((status) => {
              console.log("Status update:", status);
          });
          this.test_queryLLM();
          //this.test_fibo_prompt();
          //this.test_dummy_prompt();
      }

      private async test_queryLLM() {
          const code = `
        def factorial(n, memo={}):
            if n in memo:
                return memo[n]
            if n <= 1:
                return 1
            memo[n] = n * factorial(n - 1, memo)
            return memo[n]
        `;
          const response = await this.modelService.queryLLMModelAsync(code);
          console.log(response);
      }

    private async test_fibo_prompt() {
        const code = "def fibonacci(n): if n <= 0: return 0 elif n == 1: return 1 else: return fibonacci(n - 1) + fibonacci(n - 2) ";
            const prompt = `Given this Python code:
            "${code}"
            Generate a comment or docstring or inline code depending on the python code:
            You are an expert Python developer tasked with improving code readability by generating comments. Based on the given code snippet, produce one of the following:
            Inline Comment: Add brief explanations directly above or beside key lines of code.
            Block Comment: Provide a high-level summary at the start of a code block or function.
            Docstring: Write a detailed docstring (in triple quotes) for a function or class, following PEP 257 or PEP 8 standards.
            Just extend the code with the comment or docstring or inline code.
            `;
        
            const response = await this.modelService.queryLLMModelAsync(prompt);
            console.log(response);
      }

      private async test_dummy_prompt() {
            const code = "def add_numbers(num1, num2): return num1 + num2";
            const prompt = `Given this Python code:
            "${code}"
            Write a brief, clear inline comment explaining what this line does. Format: # comment
            Keep it concise and technical.`;
        
          const response = await this.modelService.queryLLMModelAsync(prompt);
            console.log(response);
      }
  }  