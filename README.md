# Smartautomation

This VS Code extension automatically generates comments and unit tests for your code. 

## Roadmap

- [x] Ollama Integration
- [x] Huggingface Integration
- [x] OpenAI Integration
- [x] Code Validation
- [x] HUB Frontend
- [x] Pull content of entire file for user prompt
- [x] Generate and parse comments for entire file
- [x] Highlight potential risks
- [x] Generate comment suggestions
- [x] Frontend for comment suggestions
- [x] Finalize comment generation for file with button press
- [x] Add generation for other comment types
- [x] Beautify the UI
- [ ] HIGH PRIORITY - Thorough debugging for a final complete product
- [ ] HIGH PRIORITY - Create an evaluation startegy
- [ ] HIGH PRIORITY - Collect benchmark projects for evaluation
- [ ] HIGH PRIORITY - Evaluation of Smartautomation with respect to human-ai interaction, user-friendly and quality

## Testing
### Unit Tests with Jest
https://jestjs.io/docs/getting-started
```npm install --save-dev jest```
We can test individual functions with Jest.

### Integration Testing
We need to try out how the extension reacts to different Python files, for example small and large scripts, poorly formatted code, syntax errors, non-sensible code.
The expected behavior is, that only comments get added to syntactically correct Python files. The code in the file will NOT be changed, even poorly formatted or non-sensible code.

### Performance Testing
We can measure the time for different operations of our extension, for example LLM responses, syntax checking and the UI display.
Also we need to test large projects, find the meximum amount of lines of code, that is accepted by the LLM, look how large changes are displayed in the UI.

## Evaluation
### Accuracy of generated comments
We need to create a benchmark with small to large Python projects that are not-commented, partly commented and fully commented, with a "solution" for each project.
Then we can run our extension on this benchmark and compare the results to the solution to see, how good the extension compares to good human comments.

# User experience
We could distribute our extension to people in our course and collect their feedback on UI and functionality.

## Project Overview
Title: Smartautomation
Start Date: November 16, 2024
End Date: February 28, 2025
Supervisor: Visvanathan Ramesh (vramesh@em.uni-frankfurt.de)

### Minimal viable product
The VS Code extension Smartautomation generates automatically comment suggestions for python code in a seperate view and the user can decide to accept them into his/her project or not. The user can select python files and press a button to have these files commented.

### Estimated Timeline
- 1 week: Initial Planning and Research
- 1 week: Architecture and Design
- 9 weeks: Core Development
- 3 weeks: Testing and Debugging
- 1 week: Evaluation

### Actual Workflow
- Initial Planning and Research: 2 weeks
- Testing different Development approaches: 2 weeks
- Core Development: 10 weeks
- Testing, Debugging, Evaluation: 1 week

## Requirements

### Features

- Enable users to add comments to the code using defined shortcuts or menu options. These shortcuts could be changed according to the user preferences.
- Implement syntax highlighting for comments.
- Allow categorization or tagging of comments, such as `ToDo`, `FixMe`, `DoNotChangeMe`, etc.

### Graphical User Interface

- **Dedicated Side Panel for Comments**: Feature a specialized side panel that facilitates easy access to automated comment generation functionalities, streamlining the development process.
- **Detailed Change Overview Panel**: Introduce an additional side panel specifically designed to display detailed information about changes, allowing users to easily review and understand modifications made to the code.

### **Configuration Support**

Enable users to customize their environment settings through a settings JSON file. This includes options such as defining keyboard shortcuts and specifying the AI model endpoint, providing flexibility to adapt the extension to individual preferences.

### Non-functional requirements

**Performance:**

Ensure the extension is lightweight and does not significantly impact VS Code's performance or responsiveness.

**Compatibility:**
Support for multiple operating systems, including Windows, macOS, and Linux. This given by default, since VS Code is compatible with every os.

**Scalability:**

Initially focused on supporting Python, this project is designed with scalability in mind, allowing for future expansion to accommodate additional programming languages.
