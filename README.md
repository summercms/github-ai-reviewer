# Presubmit - AI Code Reviewer

🤖 An AI-powered code review assistant that helps teams maintain high code quality by providing automated, intelligent feedback on pull requests.

[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/presubmitai?style=social)](https://x.com/presubmitai)
[![Discord](https://img.shields.io/badge/Join%20community%20on-Discord-blue?logo=discord&style=flat-square)](https://discord.gg/FcAqqB3B)
[![GitHub last commit](https://img.shields.io/github/last-commit/presubmit/ai-reviewer)](https://github.com/presubmit/ai-reviewer/commits)
[![GitHub License](https://img.shields.io/github/license/presubmit/ai-reviewer?color=yellow)](https://github.com/presubmit/ai-reviewer/blob/main/LICENSE)

## Features

- 🔍 **Intelligent Code Analysis**: Analyzes your pull requests for:

  - Code correctness and potential bugs
  - Code style and consistency
  - Performance improvements
  - Security concerns
  - Readability and maintainability
  - Best practices and design patterns
  - Spelling errors
  - Unreachable code
  - Possible runtime errors
  - Error handling

- 🚀 **Easy Integration**: Works seamlessly with your GitHub workflow
- ⚡ **Fast Reviews**: Get instant feedback on your code changes
- 💡 **Actionable Suggestions**: Receives specific, contextual improvement recommendations
- 🔒 **Security First**: Runs in your GitHub Actions environment, keeping your code secure

## Usage

### Step 1: Add LLM_API_KEY secret

1. Go to your repository's Settings > Secrets and Variables > Actions
2. Click "New repository secret"
3. Add a new secret with:
   - Name: `LLM_API_KEY`
   - Value: Your API key from one of these providers:
     - [Anthropic Console](https://console.anthropic.com/) (Claude)
     - [OpenAI API](https://platform.openai.com/api-keys) (GPT-4)
     - [Google AI Studio](https://aistudio.google.com/app/apikeys) (Gemini)

### Step 2: Create GitHub Workflow

Add this GitHub Action to your repository by creating `.github/workflows/presubmit.yml`:

```yaml
name: Presubmit.ai

permissions:
  contents: read
  pull-requests: write
  issues: write

on:
  pull_request:
  pull_request_review_comment:
    types: [created]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: presubmit/ai-reviewer@latest
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
        with:
          llm_model: "claude-3-5-sonnet-20241022"
```

The action requires:

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `LLM_API_KEY`: Your API key (added in step 1)
- `llm_model`: Which LLM model to use. Make the model is one of the LLM for which you install the API KEY

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 💬 [Discord Community](https://discord.gg/FcAqqB3B)
- 📧 [Email Support](mailto:bogdan@presubmit.ai)

---

Built with 🖤 by [Presubmit](https://presubmit.ai)
