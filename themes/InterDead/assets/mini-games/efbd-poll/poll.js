import { isAxisCode } from '@interdead/efbd-scale';

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .filter((option) => option && typeof option.axis === 'string')
    .map((option) => ({
      axis: option.axis,
      label: option.label || option.axis,
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
} = {}) {
  if (!root || !mount || typeof scalePort?.recordAnswer !== 'function') {
    return;
  }

  const mergedStrings = { ...defaultStrings, ...strings };
  const normalizedOptions = normalizeOptions(options);
  const form =
    root.ownerDocument?.createElement?.('form') || mount.ownerDocument?.createElement?.('form');
  if (!form) {
    return;
  }

  form.className = 'gm-poll';

  const title = form.ownerDocument.createElement('h3');
  title.className = 'gm-poll__title';
  title.textContent = mergedStrings.title;
  form.appendChild(title);

  const prompt = form.ownerDocument.createElement('p');
  prompt.className = 'gm-poll__prompt';
  prompt.textContent = mergedStrings.prompt;
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

  const submit = form.ownerDocument.createElement('button');
  submit.type = 'submit';
  submit.className = 'gm-poll__submit';
  submit.textContent = mergedStrings.submit;

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
}

export default initEfbdPoll;
