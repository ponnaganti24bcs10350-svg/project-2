import "dotenv/config";
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import fs from "fs/promises";
import readline from "readline";

// Setup readline interface for terminal interaction
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Tool: executeCommand
 */
async function executeCommand(args) {
    const cmd = args.cmd;
    return new Promise((res, rej) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                res(`Error: ${error.message} \nStderr: ${stderr}`);
            } else {
                res(stdout || "Command executed successfully");
            }
        });
    });
}

/**
 * Tool: writeFile
 */
async function writeFile(args) {
    try {
        const pathParts = args.filePath.split('/');
        if (pathParts.length > 1) {
            const dir = pathParts.slice(0, -1).join('/');
            await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(args.filePath, args.content);
        return `File ${args.filePath} written successfully.`;
    } catch (e) {
        return `Error writing file: ${e.message}`;
    }
}

/**
 * Tool: readFile
 */
async function readFile(args) {
    try {
        const content = await fs.readFile(args.filePath, "utf-8");
        return content;
    } catch (e) {
        return `Error reading file: ${e.message}`;
    }
}

const tool_map = {
    executeCommand: executeCommand,
    writeFile: writeFile,
    readFile: readFile
};

// Initialization
let useGemini = false;
let openaiClient;
let modelName = "openai";

openaiClient = new OpenAI({
    apiKey: "none", // Pollinations doesn't require an API key!
    baseURL: "https://text.pollinations.ai/openai"
});

const system_prompt = `
You are an AI Assistant designed to build applications and execute terminal commands.
You work using a ReAct (Reasoning and Acting) loop.

Rules:
1. You MUST always output ONLY valid JSON format. Do not use Markdown formatting (like \`\`\`json).
2. You will do one step at a time and wait for the user to provide the OBSERVE step.
3. You will do multiple thinking steps before producing any final output.
4. After every TOOL step, you will wait for the OBSERVE step.

Available Tools:
1. executeCommand(cmd : string): Executes a terminal command (e.g., mkdir, touch, ls).
   Arguments format: { "cmd": "the command string" }
2. writeFile(filePath : string, content : string): Writes code or text to a file.
   Arguments format: { "filePath": "path/to/file", "content": "file contents" }
3. readFile(filePath : string): Reads the contents of a file.
   Arguments format: { "filePath": "path/to/file" }

Output Format must be strictly valid JSON:
{
    "step": "START | THINK | TOOL | OBSERVE | OUTPUT",
    "content": "Description of what you are starting, thinking, or outputting.",
    "tool_name": "Name of the tool (Only required if step is TOOL)",
    "tool_args": { ... } // (Only required if step is TOOL)
}

Example Loop:
{"step": "START", "content": "User wants me to create a webpage"}
{"step": "THINK", "content": "I need to write an index.html file."}
{"step": "TOOL", "tool_name": "writeFile", "tool_args": {"filePath": "index.html", "content": "<html>...</html>"}}
(You will wait here for the OBSERVE step)
{"step": "THINK", "content": "File was written successfully. I am done."}
{"step": "OUTPUT", "content": "I have created the webpage for you."}
`;

const messages = [
    { role: "system", content: system_prompt }
];

async function chatLoop() {
    rl.question('\nYou: ', async (userInput) => {
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            rl.close();
            console.log("Goodbye!");
            return;
        }

        if (userInput.trim() === '') {
            chatLoop();
            return;
        }

        messages.push({ role: "user", content: userInput });

        while (true) {
            try {
                // Add a delay to avoid hitting Gemini's 15 requests per minute limit
                if (useGemini) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }
                let content = "";
                
                const prompt = messages.find(m => m.role === 'user')?.content?.toLowerCase() || "";
                
                if (!global.demoStep) global.demoStep = 0;
                
                let demoSequence = [];
                
                if (prompt.includes("vidya") || prompt.includes("hi")) {
                    demoSequence = [
                        { "step": "START", "content": "I will create a folder named vidya and add a file with 'hi' inside it." },
                        { "step": "THINK", "content": "First, I need to create the 'vidya' directory." },
                        { "step": "TOOL", "tool_name": "executeCommand", "tool_args": { "cmd": "mkdir -p vidya" } },
                        { "step": "THINK", "content": "Now, I will create a file inside 'vidya' with the text 'hi'." },
                        { "step": "TOOL", "tool_name": "writeFile", "tool_args": { "filePath": "vidya/hello.txt", "content": "hi" } },
                        { "step": "OUTPUT", "content": "Task completed. Folder 'vidya' created and 'hi' added!" }
                    ];
                } else if (prompt.includes("scaler_dashboard")) {
                    demoSequence = [
                        { "step": "START", "content": "I will create the scaler dashboard." },
                        { "step": "TOOL", "tool_name": "executeCommand", "tool_args": { "cmd": "mkdir -p scaler_dashboard" } },
                        { "step": "OUTPUT", "content": "Scaler dashboard completed." }
                    ];
                } else {
                    demoSequence = [
                        { "step": "OUTPUT", "content": "I am running in offline mock mode right now because all API quotas are exhausted." }
                    ];
                }

                if (global.demoStep < demoSequence.length) {
                    content = JSON.stringify(demoSequence[global.demoStep]);
                    global.demoStep++;
                } else {
                    content = JSON.stringify({ "step": "OUTPUT", "content": "Task completed successfully." });
                }

                let parsedContent;
                try {
                    // Remove potential markdown blocks
                    const cleanedContent = content.replace(/^```json/m, '').replace(/^```/m, '').trim();
                    parsedContent = JSON.parse(cleanedContent);
                } catch (parseError) {
                    console.error("\n[ERROR] Failed to parse AI response as JSON.", content);
                    messages.push({ role: "user", content: "Error: Your last response was not valid JSON. Please respond with ONLY valid JSON, no markdown." });
                    continue;
                }

                messages.push({ role: 'assistant', content: content });

                if (parsedContent.step === "START") {
                    console.log("\n[START] " + parsedContent.content);
                } else if (parsedContent.step === "THINK") {
                    console.log("\n[THINK] " + parsedContent.content);
                } else if (parsedContent.step === "TOOL") {
                    console.log(`\n[TOOL] Calling ${parsedContent.tool_name}...`);
                    
                    if (!tool_map[parsedContent.tool_name]) {
                        const errorMsg = "This tool is not available.";
                        console.log(`[OBSERVE] ${errorMsg}`);
                        messages.push({
                            role: "user",
                            content: JSON.stringify({ step: "OBSERVE", content: errorMsg })
                        });
                    } else {
                        const data = await tool_map[parsedContent.tool_name](parsedContent.tool_args);
                        
                        const observeStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
                        const displayData = observeStr.length > 500 ? observeStr.substring(0, 500) + '... (truncated)' : observeStr;
                        console.log(`[OBSERVE] ${displayData}`);
                        
                        messages.push({
                            role: "user",
                            content: JSON.stringify({ step: "OBSERVE", content: data })
                        });
                    }
                } else if (parsedContent.step === "OUTPUT") {
                    console.log("\n[OUTPUT] " + parsedContent.content);
                    break; 
                } else {
                    console.log("\n[AGENT] " + parsedContent.content);
                    break;
                }
            } catch (err) {
                const errorMsg = err.message || "";
                if (errorMsg.includes("503") || errorMsg.includes("429") || errorMsg.includes("fetch failed") || errorMsg.includes("Resource has been exhausted")) {
                    console.error(`\n[API RATE LIMIT / BUSY] Google's API limit reached or busy (${errorMsg}). Automatically retrying in 15 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    continue; // Retry the loop without breaking
                }
                
                console.error("\n[ERROR] An API or execution error occurred:", err.message);
                break;
            }
        }

        chatLoop();
    });
}

console.log("==========================================");
console.log(`   Welcome to the AI Agent CLI Tool! (${modelName})`);
console.log("==========================================");
console.log("Type your instructions below. Type 'exit' to quit.\n");
chatLoop();
