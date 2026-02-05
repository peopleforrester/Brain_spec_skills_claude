// ABOUTME: MCP server class with tool, resource, and prompt registration
// ABOUTME: Central orchestrator that wires all modules together and handles MCP protocol

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ToolResponse } from "./types.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<ToolResponse>;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<string>;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  handler: (args: Record<string, string>) => Promise<string>;
}

export class BrainSpecServer {
  private server: Server;
  private tools: Map<string, ToolDefinition> = new Map();
  private resources: Map<string, ResourceDefinition> = new Map();
  private prompts: Map<string, PromptDefinition> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: "brain-spec",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    this.setupHandlers();
  }

  /** Register a tool with the server */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /** Register a resource with the server */
  registerResource(resource: ResourceDefinition): void {
    this.resources.set(resource.uri, resource);
  }

  /** Register a prompt with the server */
  registerPrompt(prompt: PromptDefinition): void {
    this.prompts.set(prompt.name, prompt);
  }

  /** Get the underlying MCP Server instance for transport connection */
  getServer(): Server {
    return this.server;
  }

  private setupHandlers(): void {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${toolName}`,
              }),
            },
          ],
        };
      }

      try {
        const args = (request.params.arguments ?? {}) as Record<string, unknown>;
        const result = await tool.handler(args);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: `Tool execution failed: ${message}`,
              }),
            },
          ],
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: Array.from(this.resources.values()).map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const resource = this.resources.get(uri);

      if (!resource) {
        throw new Error(`Unknown resource: ${uri}`);
      }

      const content = await resource.handler();
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: content,
          },
        ],
      };
    });

    // List prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: Array.from(this.prompts.values()).map((p) => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        })),
      };
    });

    // Get prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const promptName = request.params.name;
      const prompt = this.prompts.get(promptName);

      if (!prompt) {
        throw new Error(`Unknown prompt: ${promptName}`);
      }

      const args = (request.params.arguments ?? {}) as Record<string, string>;
      const content = await prompt.handler(args);

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: content,
            },
          },
        ],
      };
    });
  }
}
