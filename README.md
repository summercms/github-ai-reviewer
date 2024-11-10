# Presubmit - AI Code Reviewer

🤖 An AI-powered code review assistant that helps teams maintain high code quality by providing automated, intelligent feedback on pull requests.

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

1. Add this GitHub Action to your repository by creating `.github/workflows/presubmit.yml`:

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
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
        with:
          llm_model: "claude-3-5-sonnet-20241022"
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 💬 [Discord Community](https://discord.com/invite/FcAqqB3B)
- 📧 [Email Support](mailto:bogdan@presubmit.ai)

---

Built with 🖤 by [Presubmit](https://presubmit.ai)
