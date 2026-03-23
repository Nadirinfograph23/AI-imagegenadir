type QueueTask = () => Promise<void>;

interface QueueItem {
  task: QueueTask;
  resolve: (value: void) => void;
  reject: (reason: unknown) => void;
}

class RequestQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private concurrency = 2;
  private activeCount = 0;

  async add(task: QueueTask): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;

    try {
      await item.task();
      item.resolve();
    } catch (error) {
      item.reject(error);
    } finally {
      this.activeCount--;
      this.process();
    }
  }
}

export const requestQueue = new RequestQueue();
