import { ModalLoader } from "./modelLoader";

  export class TestLoader {
      private modalLoader:ModalLoader;

      constructor() {
          this.modalLoader = new ModalLoader();
          this.test();
      }

      private async test() {
            const code = "def add_numbers(num1, num2): return num1 + num2";
            const prompt = `Given this Python code:
            "${code}"
            Write a brief, clear inline comment explaining what this line does. Format: # comment
            Keep it concise and technical.`;
        
            const response = await this.modalLoader.queryModel(prompt);
            console.log(response);
      }
  }  