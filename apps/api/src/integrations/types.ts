export interface Integration {
  id: string;
  name: string;
  init(): Promise<void>;
  getState(): Promise<Record<string, unknown>>;
  execute(command: string, params: Record<string, unknown>): Promise<unknown>;
  subscribe?(callback: (event: unknown) => void): () => void;
}
