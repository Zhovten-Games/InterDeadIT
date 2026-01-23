import { isAxisCode } from '@interdead/efbd-scale';

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .filter((option) => option && typeof option.axis === 'string')
    .map((option) => ({
      axis: option.axis,
      label: option.label || option.axis,
      i18nKey: option.i18nKey,
    }))
    .filter((option) => isAxisCode(option.axis));

const sanitizeMapUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string') {
    return '';
  }

  return rawUrl
    .trim()
    .replace(/^['"]+/, '')
    .replace(/['"]+$/, '');
};

const defaultStrings = {
  title: '',
  prompt: '',
  submit: 'Submit',
  success: '',
  completed: '',
  profileLink: 'View your score in your profile.',
  error: 'Something went wrong. Please try again.',
  required: '',
  mapAlt: 'The Tower map',
};

const renderMessageContent = (element, message) => {
  if (!element) {
    return;
  }

  element.textContent = '';

  if (!message) {
    return;
  }

  if (typeof message === 'string') {
    element.textContent = message;
    return;
  }

  if (typeof message === 'object') {
    const text = typeof message.text === 'string' ? message.text : '';
    if (text) {
      element.appendChild(element.ownerDocument.createTextNode(text));
    }

    const link = message.link;
    if (link?.href && link?.label) {
      if (text) {
        element.appendChild(element.ownerDocument.createTextNode(' '));
      }
      const anchor = element.ownerDocument.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.label;
      element.appendChild(anchor);
    }
    return;
  }

  element.textContent = String(message);
};

const isReplayBlocked = (response) => {
  const code = response?.code || response?.error || '';
  return code === 'replay_blocked';
};

const isCompletedReplay = (response) =>
  isReplayBlocked(response) && (!response?.reason || response?.reason === 'completed');

class MessageBuilder {
  constructor({ fallbackErrorText, buildProfileMessage }) {
    this.fallbackErrorText = fallbackErrorText;
    this.buildProfileMessage = buildProfileMessage;
  }

  getDefaultMessage() {
    return this.fallbackErrorText;
  }

  build(message) {
    return this.buildProfileMessage(message || this.getDefaultMessage());
  }
}

class ReplayBlockedMessageBuilder extends MessageBuilder {
  constructor({ mergedStrings, fallbackErrorText, buildProfileMessage }) {
    super({ fallbackErrorText, buildProfileMessage });
    this.mergedStrings = mergedStrings;
  }

  getDefaultMessage() {
    return this.mergedStrings.completed || super.getDefaultMessage();
  }

  build(message) {
    const chosenText = this.mergedStrings.completed || message || this.getDefaultMessage();
    return this.buildProfileMessage(chosenText);
  }

  isCompletedMessage(message) {
    if (!message) {
      return false;
    }
    return message === this.mergedStrings.completed || message === 'Mini-game already completed.';
  }

  isCompletedReplay(response) {
    return isCompletedReplay(response);
  }
}

class ProfileLinkMessageBuilder {
  constructor({ profileUrl, profileLinkLabel }) {
    this.profileUrl = profileUrl;
    this.profileLinkLabel = profileLinkLabel;
  }

  resolveLabel() {
    if (typeof this.profileLinkLabel !== 'string') {
      return '';
    }

    return this.profileLinkLabel.trim();
  }

  build(message) {
    if (message && typeof message === 'object') {
      return message;
    }

    const text = typeof message === 'string' ? message : '';
    const label = this.resolveLabel();
    const link =
      label && this.profileUrl
        ? {
            href: this.profileUrl,
            label,
          }
        : null;

    if (!text && !link) {
      return message;
    }

    return {
      text,
      link,
    };
  }
}

export function initEfbdPoll({
  root,
  mount,
  options = [],
  strings = {},
  locale = 'en',
  scalePort,
  stringKeys = {},
  logger = console,
  mapUrl,
} = {}) {
  const logContext = {
    id: root?.id || '(unknown)',
    optionsProvided: options?.length || 0,
  };

  let resolvedOptions = options;
  if (typeof options === 'string') {
    try {
      resolvedOptions = JSON.parse(options);
    } catch (error) {
      logger?.error?.('[InterDead][MiniGame][Poll] Failed to parse stringified options', {
        ...logContext,
        parseError: error?.message,
      });
      resolvedOptions = [];
    }
  }

  if (!root || !mount || typeof scalePort?.recordAnswer !== 'function') {
    logger?.error?.('[InterDead][MiniGame][Poll] Missing mount or scalePort.recordAnswer', {
      ...logContext,
      hasRoot: Boolean(root),
      hasMount: Boolean(mount),
      hasScalePort: Boolean(scalePort),
      hasRecordAnswer: typeof scalePort?.recordAnswer === 'function',
    });
    return false;
  }

  const mergedStrings = { ...defaultStrings, ...strings };
  const normalizedOptions = normalizeOptions(resolvedOptions);
  if (normalizedOptions.length === 0) {
    logger?.error?.('[InterDead][MiniGame][Poll] No valid options after normalization', {
      ...logContext,
      normalizedOptionCount: normalizedOptions.length,
    });
    return false;
  }
  const documentRef = root.ownerDocument || mount.ownerDocument;
  const profileUrl = documentRef?.body?.dataset?.profileUrl || '/profile/';
  const profileLinkLabel = mergedStrings.profileLink;
  const form = documentRef?.createElement?.('form');
  if (!form) {
    logger?.error?.('[InterDead][MiniGame][Poll] Failed to create form element', logContext);
    return false;
  }

  form.className = 'gm-poll';

  const mapSection = documentRef.createElement('div');
  mapSection.className = 'gm-poll__map';

  const mapFrame = documentRef.createElement('div');
  mapFrame.className = 'gm-poll__map-frame';

  const resolvedMapUrl = sanitizeMapUrl(mapUrl || root?.dataset?.mapUrl || strings.mapUrl);

  if (resolvedMapUrl) {
    const mapImage = documentRef.createElement('img');
    mapImage.className = 'gm-poll__map-image';
    mapImage.src = resolvedMapUrl;
    mapImage.alt = mergedStrings.mapAlt;
    mapImage.loading = 'lazy';
    if (stringKeys.mapAlt) {
      mapImage.dataset.i18n = stringKeys.mapAlt;
    }
    mapFrame.appendChild(mapImage);
  }

  mapSection.appendChild(mapFrame);
  form.appendChild(mapSection);

  const hasTitle = Boolean(mergedStrings.title?.trim() || stringKeys.title?.trim());
  if (hasTitle) {
    const title = documentRef.createElement('h3');
    title.className = 'gm-poll__title';
    title.textContent = mergedStrings.title;
    if (stringKeys.title) {
      title.dataset.i18n = stringKeys.title;
    }
    form.appendChild(title);
  }

  const prompt = documentRef.createElement('p');
  prompt.className = 'gm-poll__prompt';
  prompt.textContent = mergedStrings.prompt;
  if (stringKeys.prompt) {
    prompt.dataset.i18n = stringKeys.prompt;
  }
  form.appendChild(prompt);

  const optionsList = documentRef.createElement('div');
  optionsList.className = 'gm-poll__options';

  normalizedOptions.forEach((option, index) => {
    const optionId = `${root.id || 'efbd-poll'}-${index}`;
    const optionWrapper = documentRef.createElement('label');
    optionWrapper.className = 'gm-poll__option';
    optionWrapper.htmlFor = optionId;

    const input = documentRef.createElement('input');
    input.type = 'radio';
    input.name = 'efbd-poll-option';
    input.value = option.axis;
    input.id = optionId;
    input.className = 'gm-poll__radio';

    const labelText = documentRef.createElement('span');
    labelText.className = 'gm-poll__label';
    labelText.textContent = option.label;
    if (option.i18nKey) {
      labelText.dataset.i18n = option.i18nKey;
    }

    optionWrapper.appendChild(input);
    optionWrapper.appendChild(labelText);
    optionsList.appendChild(optionWrapper);
  });

  form.appendChild(optionsList);

  const status = documentRef.createElement('p');
  status.className = 'gm-poll__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  if (stringKeys.error) {
    status.dataset.i18nError = stringKeys.error;
  }
  if (stringKeys.success) {
    status.dataset.i18nSuccess = stringKeys.success;
  }
  if (stringKeys.required) {
    status.dataset.i18nRequired = stringKeys.required;
  }

  const submit = documentRef.createElement('button');
  submit.type = 'submit';
  submit.className = 'gm-poll__submit';
  submit.textContent = mergedStrings.submit || defaultStrings.submit;
  if (stringKeys.submit) {
    submit.dataset.i18n = stringKeys.submit;
  }

  form.appendChild(status);
  form.appendChild(submit);

  const fallbackErrorText = mergedStrings.error || defaultStrings.error;
  const profileLinkMessageBuilder = new ProfileLinkMessageBuilder({
    profileUrl,
    profileLinkLabel,
  });
  const buildProfileMessage = (message) => profileLinkMessageBuilder.build(message);

  const replayBlockedMessageBuilder = new ReplayBlockedMessageBuilder({
    mergedStrings,
    fallbackErrorText,
    buildProfileMessage,
  });

  const setStatus = (message, variant = 'info') => {
    const resolvedMessage = message || (variant === 'error' ? fallbackErrorText : '');
    if (!resolvedMessage) {
      status.hidden = true;
      renderMessageContent(status, '');
      return;
    }
    status.hidden = false;
    status.dataset.variant = variant;
    renderMessageContent(status, resolvedMessage);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selected = form.querySelector('input[name="efbd-poll-option"]:checked');
    if (!selected) {
      setStatus(mergedStrings.required, 'error');
      return;
    }

    const axis = selected.value;
    if (!isAxisCode(axis)) {
      setStatus(mergedStrings.error, 'error');
      return;
    }

    submit.disabled = true;
    setStatus('', 'info');

    const response = await scalePort.recordAnswer({
      axis,
      value: 1,
      context: {
        source: 'efbd-poll',
        answerKey: axis,
        locale,
        timestamp: new Date().toISOString(),
      },
    });

    logger?.info?.('[InterDead][MiniGame][Poll] Submitted answer', {
      ...logContext,
      axis,
      status: response?.status,
      error: response?.message || response?.error,
    });

    if (response?.status === 'ok' || response?.status === 'disabled') {
      const successMessage =
        mergedStrings.success || defaultStrings.success || 'Your response has been recorded.';
      setStatus(successMessage, 'success');
      window.InterdeadNotifications?.showSuccess?.(buildProfileMessage(successMessage));
    } else if (replayBlockedMessageBuilder.isCompletedReplay(response)) {
      const completedMessage = replayBlockedMessageBuilder.build(response?.message);
      setStatus(completedMessage, 'error');
      window.InterdeadNotifications?.showError?.(completedMessage);
    } else if (replayBlockedMessageBuilder.isCompletedMessage(response?.message)) {
      const completedMessage = replayBlockedMessageBuilder.build(response?.message);
      setStatus(completedMessage, 'error');
      window.InterdeadNotifications?.showError?.(completedMessage);
    } else {
      const errorMessage = response?.message || response?.error || mergedStrings.error;
      setStatus(errorMessage, 'error');
      window.InterdeadNotifications?.showError?.(errorMessage);
    }

    submit.disabled = false;
  });

  mount.innerHTML = '';
  mount.appendChild(form);

  return true;
}

export default initEfbdPoll;
