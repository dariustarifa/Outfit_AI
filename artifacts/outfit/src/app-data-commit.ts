import type { StoredAppData } from "./types";

interface AppDataCommitDependencies {
  getData(): StoredAppData;
  saveData(data: StoredAppData): Promise<void>;
  onCommit(data: StoredAppData): void;
}

export type AppDataMutation<Result> = (
  current: StoredAppData,
) => { next: StoredAppData; result: Result };

export function createAppDataCommitter({
  getData,
  saveData,
  onCommit,
}: AppDataCommitDependencies) {
  let queue: Promise<void> = Promise.resolve();

  return function commit<Result>(
    mutation: AppDataMutation<Result>,
  ): Promise<Result> {
    const result = queue.then(async () => {
      const { next, result: mutationResult } = mutation(getData());
      await saveData(next);
      onCommit(next);
      return mutationResult;
    });

    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
