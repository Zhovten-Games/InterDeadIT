import CountdownTimer from '../../application/timer/CountdownTimer.js';

export default class CountdownController {
  constructor({ primaryElement, betaElement }) {
    this.primaryElement = primaryElement;
    this.betaElement = betaElement;
    this.timer = new CountdownTimer({ onTick: value => this.render(value) });
  }

  start() {
    if (!this.primaryElement && !this.betaElement) {
      return;
    }
    this.timer.start();
  }

  stop() {
    this.timer.stop();
  }

  render(value) {
    if (this.primaryElement) {
      this.primaryElement.textContent = value;
    }
    if (this.betaElement) {
      this.betaElement.textContent = value;
    }
  }
}
