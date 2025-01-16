import { generateDocumentation } from "./ollama/ollamaService";

const models = [
        "qwen2.5-coder:7b",
        "codellama",
    ];

const userCode = `
class DataProcessor:
    def __init__(self, data):
        self.data = data

    def process(self):
        for item in self.data:
            if item % 2 == 0:
                self._handle_even(item)
            else:
                self._handle_odd(item)

    def _handle_even(self, item):
        result = item * 2
        self.results.append(result)

    def _handle_odd(self, item):
        result = item + 1
        self.results.append(result)

    def summarize(self):
        total = sum(self.results)
        avg = total / len(self.results)
        return total, avg


def main():
    data = [1, 2, 3, 4, 5]
    processor = DataProcessor(data)
    processor.process()
    total, avg = processor.summarize()
    print(f"Total: {total}, Average: {avg}")


MY_CONSTANT = 10

if __name__ == "__main__":
    main()
`;


export function testCommentGeneration() {
    for (const model of models) {
        generateDocumentation(userCode, model);
    }
}