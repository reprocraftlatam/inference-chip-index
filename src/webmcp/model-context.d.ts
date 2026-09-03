export {};

declare global {
  interface Document {
    readonly modelContext?: {
      registerTool(
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema?: Record<string, unknown>;
          execute(input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<unknown>;
          annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        },
        options?: { signal?: AbortSignal; exposedTo?: string[] },
      ): Promise<void>;
    };
  }
}
