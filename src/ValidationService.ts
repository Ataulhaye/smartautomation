import { exec } from "child_process";
import { promisify } from "util";


const execAsync = promisify(exec);

export class ValidationService {
    private pythonScriptPath: string;

    constructor(scriptPath: string) {
        if(!scriptPath) {
            throw new Error('Validation ScriptPath is required');
        }
        this.pythonScriptPath = scriptPath;
    }

    public async checkPythonSyntaxAsync(code: string): Promise<boolean> {
        try {
            const { stdout, stderr } = await execAsync(`echo "${code}" | python ${this.pythonScriptPath}`);

            if (stderr) {
                console.error('Error:', stderr);
                return false;
            }
            let pyRes = JSON.parse(stdout.trim());

            if (pyRes.valid) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Syntax check failed:', error);
            return false;
        }
    }
}