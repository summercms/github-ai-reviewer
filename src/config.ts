import { getInput } from "@actions/core";

export class Config {
  public llmModel: string | undefined;
  public githubToken: string | undefined;

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN;
    this.llmModel = process.env.LLM_MODEL;
  }

  public loadInputs() {
    if (process.env.DEBUG) {
      console.log("[debug] skip loading inputs");
      return;
    }
    this.llmModel = getInput("llm_model");
  }
}

const config = new Config();
config.loadInputs();

export default config;
