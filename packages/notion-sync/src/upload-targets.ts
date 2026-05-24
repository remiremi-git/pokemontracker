import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { UploadTarget } from "./publisher";

export function createFileSystemUploadTarget(targetDir: string): UploadTarget {
  return {
    async upload(files) {
      await mkdir(targetDir, { recursive: true });

      await Promise.all(
        files.map((file) => copyFile(file.localPath, path.join(targetDir, file.name)))
      );
    },
  };
}
