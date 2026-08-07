import { ParserAdapter } from "../shared/index.js";
import { zoomAdapter } from "./zoom.js";
import { teamsAdapter } from "./teams.js";
import { textAdapter } from "./text.js";

export class ParserAdapterRegistry {
  private adapters: ParserAdapter[] = [zoomAdapter, teamsAdapter, textAdapter];

  public getAdapter(content: string, filename?: string): ParserAdapter {
    for (const adapter of this.adapters) {
      if (adapter.format !== "plain-text" && adapter.canParse(content, filename)) {
        return adapter;
      }
    }
    return textAdapter;
  }
}

export const parserRegistry = new ParserAdapterRegistry();
