import init, * as wasm from './pkg/aleo_setup_redeem.js';

/** query selector @returns {Element} */
const $ = document.querySelector.bind(document);
/** query selector all @returns {Element[]} */
const $$ = q => Array.from(document.querySelectorAll(q));

/**
 * @param {Element} el
 * @param {boolean | null} isInvalid
 */
function setInvalid(el, isInvalid = true) {
  if (isInvalid === null) {
    el.removeAttribute('aria-invalid');
    return;
  }
  el.setAttribute('aria-invalid', isInvalid + '');
}

/** @param {Element} el */
const clearInvalid = el => setInvalid(el, null);

/** @typedef {({form: HTMLFormElement} | Record<string, HTMLInputElement>)} FormElements   */

/**
 * get the inputs from a form
 * @param {string} formId
 * @returns {FormElements}
 */
function formElems(formId) {
  const form = $('#' + formId);
  const elems = $$(`#${formId} input`);
  if (!form || elems.length === 0) return null;

  const entries = Object.fromEntries(
    elems.map(e => [e.getAttribute('name').split('_').slice(1).join('_'), e])
  );

  return { form, ...entries };
}

const debounce = (fn, duration = 250) => {
  let timeout;
  return function debounced() {
    clearTimeout(timeout);
    timeout = setTimeout(fn, duration);
  };
};

/**
 * @param {string} formId Form Id
 * @param {(inputs: Record<string, HTMLInputElement>) => {}} handler
 */
function formHandler(formId, handler) {
  const { form, ...inputs } = formElems(formId);
  if (!inputs) {
    console.error('invalid selectors for form', formId);
    return;
  }

  const invoker = debounce(() => {
    for (const key in inputs) {
      /** @type {HTMLInputElement} */
      const el = inputs[key];
      clearInvalid(el);
      if (el.hasAttribute('readonly')) {
        el.value = '';
      }
      $$(`#${form.id} small`).forEach(el => (el.innerText = ''));
    }
    handler(inputs);
  });

  for (const key in inputs) {
    /** @type {HTMLInputElement} */
    const el = inputs[key];
    clearInvalid(el);

    if (el.hasAttribute('readonly')) {
      el.setAttribute('data-tooltip', 'Click to copy to clipboard');
      const copyDone = debounce(() => clearInvalid(el), 1000);

      // copy text to clipboard on click
      el.addEventListener('click', _event => {
        if (el.value.length === 0) return;

        el.select();
        el.setSelectionRange(0, 99999);

        try {
          navigator.clipboard.writeText(el.value);
          setInvalid(el, false);
        } catch (err) {
          console.log('error copying text to clipboard', err);
          setInvalid(el);
        }
        copyDone();
      });
    } else {
      el.addEventListener('change', invoker);
      el.addEventListener('keyup', invoker);
      el.addEventListener('paste', invoker);
    }
  }
}

window.encrypt = (addr, plaintext) => wasm.encrypt_str(addr, plaintext);
window.account = () => JSON.parse(wasm.gen_account());

const ENCRYPTED_CODES = `
09250e9fae8c72495b9b3860f583bdc486c4ea3589ee013e294e32378daa490f0999e755f1c3d4e499b08c96a243d22d831e848cb21e1b3e47dd76c537175c0f
`
  .split('\n')
  .filter(Boolean);

init()
  .then(() => {
    formHandler('privateKeyForm', ({ privateKey, foundCode }) => {
      if (privateKey.value.length === 0) return;

      try {
        const addr = wasm.verify_private_key(privateKey.value);
        $('#pkHelper').innerText = 'Address is ' + addr;
      } catch (err) {
        setInvalid(privateKey);
        $('#pkHelper').innerText = err.toString();
        return;
      }

      for (const ciphertext of ENCRYPTED_CODES) {
        try {
          const code = wasm.decrypt_ciphertext(privateKey.value, ciphertext);
          if (!code) continue;
          setInvalid(foundCode, false);
          $('#pkCodeHelper').innerText = 'Matching code found';
          foundCode.value = code;
          return;
        } catch (err) {
          console.log('error decrypting code:', err);
          continue;
        }
      }

      $('#pkCodeHelper').innerText =
        'No matching codes found out of ' + ENCRYPTED_CODES.length;
      setInvalid(foundCode);
    });

    formHandler('encryptedForm', ({ privateKey, phrase, foundCode }) => {
      if (privateKey.value.length === 0 || phrase.value.length === 0) return;

      let decryptedKey;
      try {
        decryptedKey = wasm.decrypt_private_key(phrase.value, privateKey.value);
      } catch (err) {
        setInvalid(privateKey);
        setInvalid(phrase);
        $('#encHelper').innerText = err.toString();
        return;
      }

      try {
        const addr = wasm.verify_private_key(decryptedKey);
        $('#encHelper').innerText = 'Address is ' + addr;
      } catch (err) {
        setInvalid(privateKey);
        $('#encHelper').innerText = err.toString();
        return;
      }

      for (const ciphertext of ENCRYPTED_CODES) {
        try {
          const code = wasm.decrypt_ciphertext(decryptedKey, ciphertext);
          if (!code) continue;
          setInvalid(foundCode, false);
          $('#encCodeHelper').innerText = 'Matching code found';
          foundCode.value = code;
          return;
        } catch (err) {
          console.log('error decrypting code:', err);
          continue;
        }
      }

      $('#encCodeHelper').innerText =
        'No matching codes found out of ' + ENCRYPTED_CODES.length;
    });
  })
  .catch(e => {
    console.log(e);
    $('#wasmWarning').classList.remove('hidden');
  });
