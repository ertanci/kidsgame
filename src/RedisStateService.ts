import * as fs from 'fs';
import * as path from 'path';

export class RedisStateService {
  private memoryStore = new Map<string, any>();
  private hashStores = new Map<string, Map<string, any>>();
  private expiries = new Map<string, NodeJS.Timeout>();
  private snapshotFilePath: string;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.snapshotFilePath = path.join(process.cwd(), 'mansion_redis_snapshot.json');
    this.loadSnapshot();
  }

  // Redis-like GET command
  public get<T>(key: string): T | null {
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key) as T;
    }
    return null;
  }

  // Redis-like SET command
  public set(key: string, value: any): void {
    this.memoryStore.set(key, value);
    this.scheduleSnapshot();
  }

  // Redis-like DEL command
  public del(key: string): void {
    this.memoryStore.delete(key);
    const existingTimeout = this.expiries.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.expiries.delete(key);
    }
    this.scheduleSnapshot();
  }

  // Redis-like HSET command
  public hset(hash: string, field: string, value: any): void {
    if (!this.hashStores.has(hash)) {
      this.hashStores.set(hash, new Map<string, any>());
    }
    this.hashStores.get(hash)!.set(field, value);
    this.scheduleSnapshot();
  }

  // Redis-like HGET command
  public hget<T>(hash: string, field: string): T | null {
    const hashStore = this.hashStores.get(hash);
    if (hashStore && hashStore.has(field)) {
      return hashStore.get(field) as T;
    }
    return null;
  }

  // Redis-like HGETALL command
  public hgetall<T>(hash: string): Record<string, T> {
    const result: Record<string, T> = {};
    const hashStore = this.hashStores.get(hash);
    if (hashStore) {
      for (const [field, value] of hashStore.entries()) {
        result[field] = value as T;
      }
    }
    return result;
  }

  // Redis-like HDEL command
  public hdel(hash: string, field: string): void {
    const hashStore = this.hashStores.get(hash);
    if (hashStore) {
      hashStore.delete(field);
      if (hashStore.size === 0) {
        this.hashStores.delete(hash);
      }
      this.scheduleSnapshot();
    }
  }

  // Redis-like EXPIRE command
  public expire(key: string, seconds: number): void {
    const existingTimeout = this.expiries.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.del(key);
      this.expiries.delete(key);
    }, seconds * 1000);

    this.expiries.set(key, timeout);
  }

  // Debounced RDB cluster snapshotting to ensure durability
  private scheduleSnapshot(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.persistSnapshot();
    }, 1000); // Wait 1 second of inactivity before saving to avoid blocking I/O
  }

  private persistSnapshot(): void {
    try {
      const serializableMemoryStore: Record<string, any> = {};
      for (const [key, val] of this.memoryStore.entries()) {
        serializableMemoryStore[key] = val;
      }

      const serializableHashStores: Record<string, Record<string, any>> = {};
      for (const [hashName, fieldsMap] of this.hashStores.entries()) {
        serializableHashStores[hashName] = {};
        for (const [fieldName, val] of fieldsMap.entries()) {
          serializableHashStores[hashName][fieldName] = val;
        }
      }

      const dataToSave = {
        memory: serializableMemoryStore,
        hashes: serializableHashStores,
        timestamp: Date.now()
      };

      fs.writeFileSync(this.snapshotFilePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (error) {
      console.error('RedisStateService: Error writing RDB snapshot:', error);
    }
  }

  private loadSnapshot(): void {
    try {
      if (fs.existsSync(this.snapshotFilePath)) {
        const raw = fs.readFileSync(this.snapshotFilePath, 'utf-8');
        const parsed = JSON.parse(raw);

        if (parsed.memory) {
          for (const [key, val] of Object.entries(parsed.memory)) {
            this.memoryStore.set(key, val);
          }
        }

        if (parsed.hashes) {
          for (const [hashName, fieldsObj] of Object.entries(parsed.hashes)) {
            const hMap = new Map<string, any>();
            for (const [fieldName, val] of Object.entries(fieldsObj as Record<string, any>)) {
              hMap.set(fieldName, val);
            }
            this.hashStores.set(hashName, hMap);
          }
        }
        console.log(`RedisStateService: RDB snapshot successfully restored. Key count: ${this.memoryStore.size}, Hash count: ${this.hashStores.size}`);
      } else {
        console.log('RedisStateService: No local RDB snapshot found. Initializing empty Redis-like store.');
      }
    } catch (error) {
      console.error('RedisStateService: Error loading RDB snapshot, starting fresh:', error);
    }
  }
}
