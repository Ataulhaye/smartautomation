
# Python Smart Automation

Welcome to **Python Smart Automation**, an open-source VS Code extension that allows you to choose an LLM (Large Language Model) to automatically generate comments and docstrings for your Python code. 

![Smart Automation Sidebar](https://github.com/Ataulhaye/smartautomation/blob/master/images/extensiondark.png?raw=true)
![Smart Automation Documentation Example](https://github.com/Ataulhaye/smartautomation/blob/master/images/extensionexampledark.png?raw=true)

### Reopening the Smart Automation Sidebar

If the sidebar is closed, you can reopen it by clicking the "Open Smart Automation Sidebar" button. This button, represented by an eye icon, is located in the bottom-left corner of the VS Code window.

![Smart Automation Sidebar Button](https://github.com/Ataulhaye/smartautomation/blob/master/images/sidebarbuttondark.png?raw=true)

## Supported Models

### Remote Models:
- **OpenAI Models** (e.g., `gpt-4o`, `gpt-mini`)
- **DeepSeek Models** (e.g., `deepseek-v3`)
- **Hugging Face Models** (e.g., `Qwen`)

### Local Models:
- **Ollama**: Supports local models like `Qwen` and `CodeLlama`. Ollama must be installed on your system, and the preferred model must be downloaded.

## Configuration

You can configure the extension to use a specific model by setting the relevant properties in your VS Code settings.

## Configuring VS Code Settings

VS Code settings are managed through a `settings.json` file. To modify your settings, follow the instructions provided in the official documentation: [Settings JSON file](https://code.visualstudio.com/docs/editor/settings#_settings-json-file).


### Using OpenAI Models
To use an OpenAI model, set the following properties:
```json
"LLM.openAI.apiKey": "yourKey",
"LLM.openAI.organizationId": "yourOrganization"
```

Some properties have default values and do not need to be set explicitly but can be adjusted as desired:
```json
"LLM.openAI.modelName": "gpt-4o",
"LLM.openAI.max_completion_tokens": 2048,
"LLM.openAI.temperature": 0.3
```

**Note:** Since DeepSeek uses the OpenAI SDK, DeepSeek models can also be used.

### Using Hugging Face Models
To use a Hugging Face model, set the following properties:
```json
"LLM.huggingFace.apiKey": "yourKey"
```
Some properties have default values and do not need to be set explicitly but can be adjusted as desired:
```json
"LLM.huggingFace.endpoint": "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct",
"LLM.huggingFace.max_new_tokens": 2048,
"LLM.huggingFace.temperature": 0.7
```

### Using Ollama Local Models
To use a local model with [Ollama](https://ollama.com/), set the following properties:
```json
"LLM.ollama.modelName": "qwen2.5-coder",
"LLM.ollama.runLocalModel": true
```

#### Additional Notes on Ollama:
- Ollama **must be installed** on your system.
- The preferred model must be **downloaded** before use. Currently, all versions of **qwen** and **codellama** are supported.
- The model **will start automatically** if it is not already running on your system.

## Automatic Comment Generation
The extension automatically generates comments for the currently open Python file **every 10 seconds** if the file has any changes. You can also manually trigger comment generation by pressing the **"Generate Documentation"** button.

To change the execution interval, modify the `Parameters.interval` setting in your configuration. The interval value is specified in milliseconds.

For example, to set the interval to 10 seconds (10000 milliseconds):

```json
"Parameters.interval": 10000
```

## Keeping Existing Comments Unchanged
If you want to preserve your existing comments, include specific keywords in them, such as:
- `BUSINESS`
- `TODO`
- `FIXME`
- `DONOTCHANGEME`
- `PRESERVE`
- `BUG`
- `DEBUG`
- `HACK`
- `BODGE`
- `KLUDGE`
- `NOTE`
- `UNDONE`

## LLM Response Validation
Since LLM-generated responses might contain errors, you can enable response validation. Keep in mind that validation may take a little extra time.

```json
"Parameters.LLMResponseValidation": false
```

Set this property to `true` if you want to validate the LLM response before applying it.

## License
Copyright (c) 2025 Ata Ul Haye. All rights reserved.
This project is licensed under the [MIT License](https://github.com/Ataulhaye/smartautomation/blob/master/LICENSE).

## Get Started
1. Install the extension from the VS Code marketplace.
2. Configure the model settings as per your preference.
3. Save your Python file to trigger automatic comment generation.

### Download VS Code and Find the Extension on Marketplace

1. Click here to download VS Code for your Operating System -> [VS Code](https://code.visualstudio.com/download)
2. Go to the VS Code Extensions Marketplace by clicking the extensions icon.
3. Search for **"Python Smart Automation"** in the search bar.
4. Click **"Install"**.

## Report Bugs & Feature Requests
If you encounter any bugs or have feature requests, please email us at **aahmad@daenet.com**.


Enjoy coding with **Python Smart Automation**!










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
