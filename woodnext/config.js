/* ==========================================================================
   НАСТРОЙКИ САЙТА — всё, что нужно поменять, находится здесь.
   Значения в квадратных скобках [ ... ] — заглушки, их нужно заменить.
   Ссылку или контакт, который вы оставите пустым '' или в [скобках],
   сайт просто не покажет.
   ========================================================================== */
window.WOODNEXT_CONFIG = {
  // Ссылка на Google Apps Script (веб-приложение, заканчивается на /exec) — туда уходят заявки
  // и оттуда админка берёт список. Работает в России без VPN.
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwW_YtpWwbaTR07oQeoY18N--_ujKYImsVKujcb9xfxp9wTt3K8attZ2nnL2_uwjuCD6g/exec',

  // Логотип уже стоит в разметке (images/logo.png). Чтобы сменить — замените сам файл.
  LOGO_IMAGE: '',

  // Адрес производства — показывается на сайте и уходит в Яндекс Карты.
  ADDRESS: 'Каменск-Уральский, ул. Суворова, 47В, корпус 7',
  // Ссылка на точку в Яндекс Картах. Если пусто — карта откроется поиском по ADDRESS.
  // Чтобы указать точное место: Яндекс Карты → найти здание → «Поделиться» → скопировать ссылку.
  MAP_URL: '',

  // Телефон для связи: как показывать и как набирать.
  PHONE_TEXT: '+7 (343) 300-96-98',
  PHONE_TEL: '+73433009698',

  // Соцсети.
  INSTAGRAM: 'https://www.instagram.com/woodnext_96/',
  MAX: 'https://max.ru/join/mFmMlgwkAFoPRpCLstjsttuOVkNcu2NRC4KbWCs-dog',
  TELEGRAM: 'https://t.me/woodnext_96',
  VK: 'https://vk.ru/woodnext_96',

  // Оператор персональных данных (для страницы политики).
  COMPANY_NAME: '[юр. название компании]',
  COMPANY_INN: '[ИНН]',
  COMPANY_ADDRESS: '[юридический адрес]',
  COMPANY_EMAIL: '[e-mail для обращений]',

  // Мероприятие: 8 ноября 2026, 12:00 по Екатеринбургу (UTC+5) = 07:00 UTC.
  EVENT_START_UTC: '2026-11-08T07:00:00Z',
  EVENT_END_UTC: '2026-11-08T10:00:00Z'
};

// Куда отправлять заявки: Google Apps Script, а если его ещё нет и сайт открыт на Netlify — сервер Netlify.
(function (C) {
  var g = C.GOOGLE_SCRIPT_URL, netlify = /netlify\.app$/.test(location.hostname);
  C.SCRIPT_URL = g || (netlify ? '/api/signup' : '');
  C.ADMIN_URL = g || (netlify ? '/api/admin' : '');
})(window.WOODNEXT_CONFIG);
