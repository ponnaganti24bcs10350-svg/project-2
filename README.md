# AI Agent CLI Tool

A conversational CLI agent that loops through thinking, acting (using tools), and observing to build projects like cloning web pages based on user instructions.

## Requirements
- Node.js
- OpenAI API Key

## Setup
1. Run `npm install`
2. Create a `.env` file based on `.env.example` and put your `OPENAI_API_KEY` in it:
   ```bash
   cp .env.example .env
   # Edit .env and insert your actual key
   ```

## Running the Agent
Run the script using:
```bash
node index.js
```

## How to use
When the agent starts, you will see a prompt:
```
You:
```
You can type your command here. For example:
> `Create a folder named scaler_clone and create a simple clone of the Scaler Academy website using HTML, CSS and JS inside that folder. Include a Header, Hero Section, and Footer.`

The agent will then go through a loop of:
- `START`: Understanding the goal
- `THINK`: Reasoning about the next step
- `TOOL`: Calling a tool like `executeCommand`, `writeFile`, or `readFile`
- `OBSERVE`: Checking the result of the tool execution
- `OUTPUT`: Final output when the task is complete

## Notes
- Ensure your OpenAI key is active and has credits (we use the `gpt-4o-mini` model, which is fast and cost-effective).
- Type `exit` or `quit` to exit the application.
