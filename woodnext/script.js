(function () {
  'use strict';

  var C = window.WOODNEXT_CONFIG || {};
  var START = new Date(C.EVENT_START_UTC || '2026-11-08T07:00:00Z');
  var END = new Date(C.EVENT_END_UTC || '2026-11-08T10:00:00Z');
  var STORAGE_KEY = 'woodnext_dod_2026';

  // Значение не заполнено, если пустое или осталось заглушкой в [скобках]
  function isSet(v) { return typeof v === 'string' && v.trim() !== '' && v.trim().charAt(0) !== '['; }
  function store(get, val) {
    try {
      if (get) return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (val === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch (e) { return null; }
  }

  /* ---------- Подстановка настроек из config.js ---------- */
  var mapUrl = isSet(C.MAP_URL) ? C.MAP_URL
    : 'https://yandex.ru/maps/?text=' + encodeURIComponent(isSet(C.ADDRESS) ? C.ADDRESS : 'Каменск-Уральский WOODNEXT');
  var links = {
    MAP: mapUrl,
    PHONE: isSet(C.PHONE_TEL) ? 'tel:' + C.PHONE_TEL.replace(/[^\d+]/g, '') : '',
    INSTAGRAM: C.INSTAGRAM, MAX: C.MAX, TELEGRAM: C.TELEGRAM, VK: C.VK
  };

  document.querySelectorAll('[data-fill]').forEach(function (el) {
    var v = C[el.getAttribute('data-fill')];
    if (typeof v === 'string' && v.trim()) el.textContent = v;
  });
  document.querySelectorAll('[data-href]').forEach(function (el) {
    var key = el.getAttribute('data-href');
    var url = links[key];
    if (isSet(url)) { el.href = url; return; }
    if (key === 'PHONE') { el.removeAttribute('href'); return; }
    var li = el.closest('li');
    (li || el).hidden = true;
  });

  // Логотип: если указан файл — заменяем текстовую заглушку картинкой
  if (isSet(C.LOGO_IMAGE)) {
    document.querySelectorAll('.logo').forEach(function (el) {
      var img = new Image();
      img.src = C.LOGO_IMAGE;
      img.alt = 'WOODNEXT';
      img.onload = function () { el.innerHTML = ''; el.appendChild(img); };
    });
  }

  // Фото: если файл из data-photo существует — показываем его вместо плейсхолдера
  document.querySelectorAll('[data-photo]').forEach(function (fig) {
    var img = new Image();
    img.alt = fig.textContent.trim();
    img.decoding = 'async';
    img.loading = 'lazy';
    img.onload = function () { fig.appendChild(img); };
    img.src = fig.getAttribute('data-photo');
  });

  /* ---------- Таймер ---------- */
  var cd = document.getElementById('countdown');
  var cdTimer;
  function plural(n, forms) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return forms[0];
    if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return forms[1];
    return forms[2];
  }
  var forms = {
    d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'],
    m: ['минута', 'минуты', 'минут'], s: ['секунда', 'секунды', 'секунд']
  };
  function tick() {
    var diff = START - Date.now();
    if (diff <= 0) {
      cd.classList.add('is-over');
      cd.querySelector('.countdown__label').textContent =
        Date.now() < END ? 'Мы уже начали — приезжайте!' : 'Спасибо всем, кто был с нами!';
      clearInterval(cdTimer);
      return;
    }
    var t = Math.floor(diff / 1000);
    var v = { d: Math.floor(t / 86400), h: Math.floor(t % 86400 / 3600), m: Math.floor(t % 3600 / 60), s: t % 60 };
    Object.keys(v).forEach(function (k) {
      cd.querySelector('[data-cd="' + k + '"]').textContent = (v[k] < 10 ? '0' : '') + v[k];
      cd.querySelector('[data-cd-l="' + k + '"]').textContent = plural(v[k], forms[k]);
    });
  }
  if (cd) { tick(); cdTimer = setInterval(tick, 1000); }

  /* ---------- Появление блоков ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Плавающая кнопка «Записаться» ---------- */
  var sticky = document.getElementById('stickyCta');
  var heroActions = document.querySelector('.hero__actions');
  var signup = document.getElementById('signup');
  if (sticky && 'IntersectionObserver' in window) {
    var heroVisible = true, formVisible = false;
    var upd = function () {
      var show = !heroVisible && !formVisible;
      sticky.classList.toggle('is-shown', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      sticky.tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; upd(); }).observe(heroActions);
    new IntersectionObserver(function (e) { formVisible = e[0].isIntersecting; upd(); }).observe(signup);
  }

  /* ---------- Маска телефона ---------- */
  var phone = document.getElementById('f-phone');
  var prevDigits = '';
  function phoneDigits(raw) {
    var d = raw.replace(/\D/g, '');
    if (!d) return '';
    // Вставили номер целиком поверх «+7 (» — убираем лишнюю семёрку спереди
    while (d.length > 11 && d[0] === '7') d = d.slice(1);
    if (d[0] === '8') d = '7' + d.slice(1);
    else if (d[0] !== '7') d = '7' + d;
    return d.slice(0, 11);
  }
  function formatPhone(d) {
    if (!d) return '';
    var r = '+7';
    if (d.length > 1) r += ' (' + d.slice(1, 4);
    if (d.length >= 4) r += ')';
    if (d.length > 4) r += ' ' + d.slice(4, 7);
    if (d.length > 7) r += '-' + d.slice(7, 9);
    if (d.length > 9) r += '-' + d.slice(9, 11);
    return r;
  }
  phone.addEventListener('input', function (e) {
    var d = phoneDigits(phone.value);
    // Стирание скобки/дефиса не меняет цифры — тогда стираем последнюю цифру
    if (e.inputType === 'deleteContentBackward' && d === prevDigits) d = d.slice(0, -1);
    if (d === '7' && e.inputType && e.inputType.indexOf('delete') === 0) d = '';
    prevDigits = d;
    phone.value = formatPhone(d);
    clearErr('phone');
  });
  phone.addEventListener('focus', function () {
    if (!phone.value) { phone.value = '+7 ('; prevDigits = '7'; }
  });
  phone.addEventListener('blur', function () {
    if (phoneDigits(phone.value).length <= 1) { phone.value = ''; prevDigits = ''; }
  });

  /* ---------- Форма ---------- */
  var form = document.getElementById('signupForm');
  var nameInput = document.getElementById('f-name');
  var trap = document.getElementById('f-company');
  var btn = document.getElementById('submitBtn');
  var formErr = document.getElementById('formErr');
  var formCard = document.getElementById('formCard');
  var thanks = document.getElementById('thanks');
  var openedAt = Date.now();
  var sending = false;

  function setErr(name, msg) {
    var p = form.querySelector('[data-err="' + name + '"]');
    if (p) { p.textContent = msg; p.closest('.field').classList.add('has-error'); }
  }
  function clearErr(name) {
    var p = form.querySelector('[data-err="' + name + '"]');
    if (p) { p.textContent = ''; p.closest('.field').classList.remove('has-error'); }
  }
  nameInput.addEventListener('input', function () { clearErr('name'); });
  form.querySelectorAll('input[name=guests]').forEach(function (r) {
    r.addEventListener('change', function () { clearErr('guests'); });
  });

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function validate() {
    var ok = true, first = null;
    var name = nameInput.value.trim().replace(/\s+/g, ' ');
    var digits = phoneDigits(phone.value);
    var guests = (form.querySelector('input[name=guests]:checked') || {}).value;
    if (name.length < 2) { setErr('name', 'Пожалуйста, укажите имя'); ok = false; first = first || nameInput; }
    if (digits.length !== 11) { setErr('phone', 'Введите номер полностью: 11 цифр'); ok = false; first = first || phone; }
    if (!guests) { setErr('guests', 'Выберите количество гостей'); ok = false; first = first || form.querySelector('input[name=guests]'); }
    if (first) first.focus({ preventScroll: false });
    return ok ? {
      name: name,
      phone: formatPhone(digits),
      guests: Number(guests),
      source: (form.querySelector('input[name=source]:checked') || {}).value || 'Не указано'
    } : null;
  }

  function send(payload) {
    var body = JSON.stringify(payload);
    // text/plain — «простой» запрос без предварительной CORS-проверки, Apps Script его принимает
    return fetch(C.SCRIPT_URL, {
      method: 'POST', body: body, redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'server');
      return res;
    }, function (netErr) {
      // Если браузер не смог прочитать ответ (ограничения CORS), отправляем «вслепую».
      // Повтор безопасен: скрипт отбрасывает заявку с тем же id.
      if (netErr instanceof TypeError) {
        return fetch(C.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: body,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' } }).then(function () { return { ok: true }; });
      }
      throw netErr;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    formErr.textContent = '';

    // Ловушка: заполненное скрытое поле — это бот. Делаем вид, что всё хорошо.
    if (trap.value) { showThanks(); return; }

    var data = validate();
    if (!data) return;

    if (!isSet(C.SCRIPT_URL)) {
      formErr.textContent = 'Форма ещё не подключена: впишите SCRIPT_URL в config.js.';
      return;
    }

    sending = true;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.querySelector('.btn__label').textContent = 'Отправляем…';

    data.id = form.dataset.reqId || (form.dataset.reqId = uid());
    data.company = trap.value;
    data.elapsed = Math.round((Date.now() - openedAt) / 1000);
    data.page = location.href.slice(0, 200);

    send(data).then(function () {
      store(false, { name: data.name, at: Date.now() });
      showThanks();
    }).catch(function () {
      formErr.textContent = 'Не удалось отправить. Проверьте интернет и попробуйте ещё раз.';
    }).then(function () {
      sending = false;
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.querySelector('.btn__label').textContent = 'Записаться';
    });
  });

  function showThanks() {
    formCard.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { thanks.focus({ preventScroll: true }); }, 400);
  }

  document.getElementById('againBtn').addEventListener('click', function () {
    form.reset();
    delete form.dataset.reqId;
    prevDigits = '';
    openedAt = Date.now();
    thanks.hidden = true;
    formCard.hidden = false;
    nameInput.focus();
  });

  // Уже записывался с этого телефона — сразу показываем «Спасибо»
  if (store(true)) { formCard.hidden = true; thanks.hidden = false; }

  /* ---------- Календарь ---------- */
  function icsDate(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  var place = isSet(C.ADDRESS) ? C.ADDRESS : 'Производство WOODNEXT, Каменск-Уральский';
  var title = 'День открытых дверей WOODNEXT';
  var details = 'Экскурсия по производству модульных домов и бань, розыгрыш призов. Карта: ' + mapUrl;

  document.getElementById('icsBtn').addEventListener('click', function () {
    var esc = function (s) { return s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n'); };
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WOODNEXT//Open Day//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:woodnext-open-day-20261108@woodnext',
      'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(START),
      'DTEND:' + icsDate(END),
      'SUMMARY:' + esc(title),
      'LOCATION:' + esc(place),
      'DESCRIPTION:' + esc(details),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('Завтра в 12:00 — ' + title), 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('Через 2 часа — ' + title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'woodnext-8-noyabrya.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  document.getElementById('gcalBtn').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(title) +
    '&dates=' + icsDate(START) + '/' + icsDate(END) +
    '&location=' + encodeURIComponent(place) +
    '&details=' + encodeURIComponent(details);
})();
