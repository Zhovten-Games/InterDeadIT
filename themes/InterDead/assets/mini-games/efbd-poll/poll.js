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

const defaultStrings = {
  title: '',
  prompt: '',
  submit: 'Submit',
  success: '',
  error: 'Something went wrong. Please try again.',
  required: '',
  continue: 'Continue',
  mapAlt: 'The Tower map',
};

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
  const form = documentRef?.createElement?.('form');
  if (!form) {
    logger?.error?.('[InterDead][MiniGame][Poll] Failed to create form element', logContext);
    return false;
  }

  form.className = 'gm-poll';

  const title = documentRef.createElement('h3');
  title.className = 'gm-poll__title';
  title.textContent = mergedStrings.title;
  if (stringKeys.title) {
    title.dataset.i18n = stringKeys.title;
  }
  form.appendChild(title);

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

  const setStatus = (message, variant = 'info') => {
    const resolvedMessage = message || (variant === 'error' ? fallbackErrorText : '');
    if (!resolvedMessage) {
      status.hidden = true;
      status.textContent = '';
      return;
    }
    status.hidden = false;
    status.dataset.variant = variant;
    status.textContent = resolvedMessage;
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
      setStatus(mergedStrings.success, 'success');
    } else {
      const errorMessage = response?.message || response?.error || mergedStrings.error;
      setStatus(errorMessage, 'error');
      window.InterdeadNotifications?.showError?.(errorMessage);
    }

    submit.disabled = false;
  });

  const mapScreen = documentRef.createElement('div');
  mapScreen.className = 'gm-poll__map-screen';

  const mapFrame = documentRef.createElement('div');
  mapFrame.className = 'gm-poll__map-frame';

  const resolvedMapUrl = mapUrl || root?.dataset?.mapUrl || strings.mapUrl;

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

  const continueButton = documentRef.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'gm-poll__continue';
  continueButton.textContent = mergedStrings.continue;
  continueButton.disabled = true;
  if (stringKeys.continue) {
    continueButton.dataset.i18n = stringKeys.continue;
  }

  setTimeout(() => {
    continueButton.disabled = false;
    mapScreen.dataset.ready = 'true';
  }, 1000);

  const showPoll = () => {
    mount.innerHTML = '';
    mount.appendChild(form);
  };

  continueButton.addEventListener('click', showPoll);

  mapScreen.appendChild(mapFrame);
  mapScreen.appendChild(continueButton);

  mount.innerHTML = '';
  mount.appendChild(mapScreen);

  return true;
}

export default initEfbdPoll;
