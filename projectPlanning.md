## Roadmap
We started this project for a class at our university and this roadmap served as a guide for us to keep an overview of what we already accomplished and what needed to be done until the deadline. This included also organizational steps and tasks for testing and evaluation. It is unclear at the time what will happen with this project after we finished the class, but we decided to shift the focus of this roadmap to show what has been implemented in which order and afterwards which features could be implemented in the future.

- [x] Ollama Integration
- [x] Huggingface Integration
- [x] OpenAI Integration
- [x] Code Validation
- [x] Pull content of entire file for user prompt
- [x] Generate and parse comments for entire file
- [x] Generate comment suggestions
- [x] Compare View Frontend
- [x] Finalize comment generation for file with button press
- [ ] Fix empty view
- [ ] Support other file types
- [ ] Implement automated unit test generation

## Evaluation
**TODO here we can post evaluation results**

## Project Overview
Title: Smartautomation
Start Date: November 16, 2024
End Date: February 28, 2025
Supervisor: Visvanathan Ramesh

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

## License
This project is licensed under the MIT license.
