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
  submit: '',
  success: '',
  error: '',
  required: '',
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
  const form =
    root.ownerDocument?.createElement?.('form') || mount.ownerDocument?.createElement?.('form');
  if (!form) {
    logger?.error?.('[InterDead][MiniGame][Poll] Failed to create form element', logContext);
    return false;
  }

  form.className = 'gm-poll';

  const title = form.ownerDocument.createElement('h3');
  title.className = 'gm-poll__title';
  title.textContent = mergedStrings.title;
  if (stringKeys.title) {
    title.dataset.i18n = stringKeys.title;
  }
  form.appendChild(title);

  const prompt = form.ownerDocument.createElement('p');
  prompt.className = 'gm-poll__prompt';
  prompt.textContent = mergedStrings.prompt;
  if (stringKeys.prompt) {
    prompt.dataset.i18n = stringKeys.prompt;
  }
  form.appendChild(prompt);

  const optionsList = form.ownerDocument.createElement('div');
  optionsList.className = 'gm-poll__options';

  normalizedOptions.forEach((option, index) => {
    const optionId = `${root.id || 'efbd-poll'}-${index}`;
    const optionWrapper = form.ownerDocument.createElement('label');
    optionWrapper.className = 'gm-poll__option';
    optionWrapper.htmlFor = optionId;

    const input = form.ownerDocument.createElement('input');
    input.type = 'radio';
    input.name = 'efbd-poll-option';
    input.value = option.axis;
    input.id = optionId;
    input.className = 'gm-poll__radio';

    const labelText = form.ownerDocument.createElement('span');
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

  const status = form.ownerDocument.createElement('p');
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

  const submit = form.ownerDocument.createElement('button');
  submit.type = 'submit';
  submit.className = 'gm-poll__submit';
  submit.textContent = mergedStrings.submit;
  if (stringKeys.submit) {
    submit.dataset.i18n = stringKeys.submit;
  }

  form.appendChild(status);
  form.appendChild(submit);

  const setStatus = (message, variant = 'info') => {
    if (!message) {
      status.hidden = true;
      status.textContent = '';
      return;
    }
    status.hidden = false;
    status.dataset.variant = variant;
    status.textContent = message;
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

    if (response?.status === 'ok' || response?.status === 'disabled') {
      setStatus(mergedStrings.success, 'success');
    } else {
      setStatus(mergedStrings.error, 'error');
    }

    submit.disabled = false;
  });

  mount.innerHTML = '';
  mount.appendChild(form);

  return true;
}

export default initEfbdPoll;
