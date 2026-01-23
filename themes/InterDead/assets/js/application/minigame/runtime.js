import MiniGameAssetLoader from './MiniGameAssetLoader.js';
import MiniGameLauncher from './MiniGameLauncher.js';
import EfbdScaleTriggerPort from '../../infrastructure/minigame/EfbdScaleTriggerPort.js';

const loader = new MiniGameAssetLoader({ documentRef: document });
const scalePort = new EfbdScaleTriggerPort({
  emitScaleTrigger: window?.InterdeadPorts?.emitScaleTrigger,
});

const resolvePorts = () => {
  const authVisibilityPort = window?.InterdeadPorts?.authVisibility;
  return { authVisibilityPort, scalePort };
};

const launcher = new MiniGameLauncher({
  authVisibilityPort: resolvePorts().authVisibilityPort,
  assetLoader: loader,
  documentRef: document,
  logger: console,
  scalePort,
});

const register = (config) => {
  const ports = resolvePorts();
  launcher.authVisibilityPort = ports.authVisibilityPort;
  const enriched = { ...config, scalePort: config.scalePort || ports.scalePort };
  launcher.register(enriched);
};

const queue = window.InterdeadMiniGamesQueue || window.InterdeadMiniGames?.queue || [];
queue.forEach((config) => register(config));

window.InterdeadMiniGames = window.InterdeadMiniGames || {};
window.InterdeadMiniGames.register = register;
window.InterdeadMiniGames.queue = [];

window.addEventListener('interdead:ports-ready', () => {
  const ports = resolvePorts();
  launcher.authVisibilityPort = ports.authVisibilityPort;
  ports.scalePort?.setEmitter?.(window?.InterdeadPorts?.emitScaleTrigger);
  launcher.setScalePort(ports.scalePort);
  launcher.refreshAuthBindings();
});
