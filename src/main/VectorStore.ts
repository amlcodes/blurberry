import { app } from "electron";
import { existsSync, unlinkSync } from "fs";
import { HierarchicalNSW } from "hnswlib-node";
import { join } from "path";

export class VectorStore {
  private index: HierarchicalNSW;
  private indexPath: string;
  private dimension: number = 1536; // text-embedding-3-small

  constructor() {
    const userDataPath = app.getPath("userData");
    this.indexPath = join(userDataPath, "history-vectors.bin");
    this.index = new HierarchicalNSW("cosine", this.dimension);
    this.loadOrCreateIndex();
  }

  private loadOrCreateIndex(): void {
    if (existsSync(this.indexPath)) {
      try {
        this.index.readIndex(this.indexPath);
        console.log("[VectorStore] Loaded existing vector index");
      } catch (error) {
        console.error(
          "[VectorStore] Failed to load index, creating new:",
          error,
        );
        this.index.initIndex(10000); // max 10k pages
      }
    } else {
      this.index.initIndex(10000); // max 10k pages
      console.log("[VectorStore] Created new vector index");
    }
  }

  async addVector(visitId: number, embedding: number[]): Promise<void> {
    try {
      this.index.addPoint(embedding, visitId);
      this.index.writeIndex(this.indexPath);
      console.log(`[VectorStore] Added vector for visit ${visitId}`);
    } catch (error) {
      console.error(
        `[VectorStore] Failed to add vector for visit ${visitId}:`,
        error,
      );
    }
  }

  search(queryEmbedding: number[], k: number = 3): number[] {
    try {
      const result = this.index.searchKnn(queryEmbedding, k);
      console.log(`[VectorStore] Found ${result.neighbors.length} matches`);
      return result.neighbors;
    } catch (error) {
      console.error("[VectorStore] Search failed:", error);
      return [];
    }
  }

  clear(): void {
    try {
      // Delete the index file if it exists
      if (existsSync(this.indexPath)) {
        unlinkSync(this.indexPath);
        console.log("[VectorStore] Deleted vector index file");
      }

      // Reinitialize with a fresh empty index
      this.index = new HierarchicalNSW("cosine", this.dimension);
      this.index.initIndex(10000);
      console.log("[VectorStore] Cleared and reinitialized vector index");
    } catch (error) {
      console.error("[VectorStore] Failed to clear index:", error);
    }
  }

  getCurrentCount(): number {
    try {
      return this.index.getCurrentCount();
    } catch {
      return 0;
    }
  }
}
