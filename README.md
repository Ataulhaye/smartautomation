
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


### Download VS Code and Install Python Smart Automation  

1. [Download VS Code](https://code.visualstudio.com/download) for your operating system.  
2. Open VS Code and go to the Extensions Marketplace by clicking the Extensions icon in the sidebar.  
3. Search for **"Python Smart Automation"** in the search bar.  
4. Click **"Install"** to add the extension.  

Alternatively, you can directly install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Goethe-Uni-Haye.smartautomation&ssr=false#overview).  


## Report Bugs & Feature Requests
If you encounter any bugs or have feature requests, please email us at **aahmad@daenet.com**.


Enjoy coding with **Python Smart Automation**!