import { S3Storage } from "coze-coding-dev-sdk";

let storageInstance: S3Storage | null = null;

export function getStorage(): S3Storage {
  if (!storageInstance) {
    storageInstance = new S3Storage({ region: "cn-beijing" });
  }
  return storageInstance;
}
