export default class CountdownTimer {
  constructor({ onTick, intervalMs = 1000, nowProvider = () => new Date() }) {
    this.onTick = onTick;
    this.intervalMs = intervalMs;
    this.nowProvider = nowProvider;
    this.intervalId = null;
  }

  start() {
    this.tick();
    this.stop();
    this.intervalId = window.setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick() {
    const now = this.nowProvider();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const remaining = Math.max(0, nextMidnight.getTime() - now.getTime());
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    const formatted = [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
    this.onTick?.(formatted);
  }
}
