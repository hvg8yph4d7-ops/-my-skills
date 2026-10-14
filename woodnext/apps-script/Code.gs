/**
 * WOODNEXT — День открытых дверей. Приём заявок с сайта.
 *
 * Что делает:
 *  1) записывает каждую заявку новой строкой на лист «Заявки»;
 *  2) держит лист «Итого» с формулами (заявки, гости, разбивка по источникам);
 *  3) отправляет уведомление в Telegram-чат организаторов.
 *
 *  4) отдаёт список заявок в админку (admin.html) по паролю и отмечает пришедших.
 *
 * Токен бота хранится только здесь, на стороне Google, — на сайте его не видно.
 * Пошаговая настройка — в файле ИНСТРУКЦИЯ.md.
 */

// ===================== НАСТРОЙКИ =====================
var TELEGRAM_BOT_TOKEN = '';   // токен от @BotFather, например '1234567890:AAH...'
var TELEGRAM_CHAT_ID   = '';   // id чата организаторов, например '-1001234567890'
var ADMIN_PASSWORD     = '';   // свой пароль для админки. Пусто — действует пароль, который выдал Claude
// Отпечаток выданного пароля (сам пароль из него не узнать)
var ADMIN_HASH = '77a3424ff4f294e5f7b43472d022695d70edaa556c08ffe13317c23a518c51fe';
// =====================================================

var TZ = 'Asia/Yekaterinburg';
var SHEET_LEADS = 'Заявки';
var SHEET_TOTAL = 'Итого';
var HEADERS = ['Дата и время заявки', 'Имя', 'Телефон', 'Сколько человек', 'Источник', 'Повтор номера', 'ID заявки', 'Пришёл'];
var SOURCES = ['Max', 'Telegram', 'WhatsApp', 'VK', 'Instagram', 'От знакомых', 'Другое', 'Не указано'];


/** Приём заявки с сайта. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = parseBody_(e);
    if (data.action === 'admin') return json_(admin_(data));

    // Ловушка для ботов: скрытое поле заполнено или форма заполнена быстрее 2 секунд
    if (data.company || (Number(data.elapsed) > 0 && Number(data.elapsed) < 2)) {
      return json_({ ok: true });
    }

    var lead = validate_(data);
    if (lead.error) return json_({ ok: false, error: lead.error });

    lock.waitLock(20000);
    var sheet = setup();

    // Защита от повторной отправки одной и той же заявки
    var cache = CacheService.getScriptCache();
    if (cache.get('req_' + lead.id) || idExists_(sheet, lead.id)) {
      return json_({ ok: true, duplicate: true });
    }

    var repeat = phoneExists_(sheet, lead.phone);
    // Апостроф — чтобы таблица хранила телефон как текст, а не считала «+7» формулой
    sheet.appendRow([new Date(), lead.name, "'" + lead.phone, lead.guests, lead.source, repeat ? 'да' : '', lead.id]);
    SpreadsheetApp.flush();
    cache.put('req_' + lead.id, '1', 21600);

    var totals = getTotals_(sheet);
    lock.releaseLock();

    notifyTelegram_(lead, repeat, totals);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** Проверка в браузере: откройте ссылку /exec — увидите «ok». */
function doGet() {
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}


/**
 * Создаёт листы «Заявки» и «Итого» с заголовками и формулами.
 * Запустите один раз вручную (кнопка «Выполнить»), дальше вызывается сам.
 */
function setup() {
  var ss = getSpreadsheet_();
  if (ss.getSpreadsheetTimeZone() !== TZ) ss.setSpreadsheetTimeZone(TZ);

  var sheet = ss.getSheetByName(SHEET_LEADS);
  if (!sheet) {
    sheet = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0
      ? ss.getSheets()[0].setName(SHEET_LEADS)
      : ss.insertSheet(SHEET_LEADS, 0);
  }
  if (sheet.getRange(1, HEADERS.length).getValue() !== HEADERS[HEADERS.length - 1]) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#121418').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('dd.MM.yyyy HH:mm:ss');
    sheet.getRange('C:C').setNumberFormat('@');
    sheet.getRange('D:D').setNumberFormat('0');
    sheet.setColumnWidths(1, 1, 160);
    sheet.setColumnWidths(2, 1, 160);
    sheet.setColumnWidths(3, 1, 170);
    sheet.setColumnWidths(4, 2, 130);
    sheet.setColumnWidths(6, 1, 110);
    sheet.setColumnWidths(7, 1, 170);
    sheet.setColumnWidths(8, 1, 90);
  }

  if (!ss.getSheetByName(SHEET_TOTAL)) buildTotals_(ss);
  return sheet;
}

/**
 * Таблица для заявок. Если скрипт открыт из таблицы (Расширения → Apps Script) — берётся она.
 * Если скрипт создан отдельно на script.google.com (например, с телефона) — скрипт сам создаёт
 * таблицу «WOODNEXT — заявки» у вас в Google Диске и запоминает её. Ссылка — в журнале после setup.
 */
function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* таблицу удалили — создадим новую */ }
  }
  ss = SpreadsheetApp.create('WOODNEXT — заявки на день открытых дверей');
  props.setProperty('SHEET_ID', ss.getId());
  console.log('Создана таблица: ' + ss.getUrl());
  return ss;
}

/** Показывает ссылку на таблицу с заявками. Запустите из редактора, если потеряли её. */
function showSheetUrl() {
  console.log('Таблица с заявками: ' + setup().getParent().getUrl());
}

/** Лист «Итого». Повторные заявки с того же номера в итог не входят. */
function buildTotals_(ss) {
  var t = ss.insertSheet(SHEET_TOTAL);
  var L = "'" + SHEET_LEADS + "'!";
  var notRepeat = L + 'F2:F,"<>да"';

  t.getRange('A1').setValue('Итого по записи').setFontWeight('bold').setFontSize(14);
  t.getRange('A3:B6').setValues([
    ['Количество заявок', '=COUNTIFS(' + L + 'B2:B,"<>",' + notRepeat + ')'],
    ['Общее количество гостей', '=SUMIFS(' + L + 'D2:D,' + notRepeat + ')'],
    ['Повторные заявки (не в итоге)', '=COUNTIF(' + L + 'F2:F,"да")'],
    ['Всего строк в «Заявках»', '=COUNTA(' + L + 'B2:B)']
  ]);
  t.getRange('D3:E4').setValues([
    ['Пришли (заявок)', '=COUNTIFS(' + L + 'H2:H,"да",' + notRepeat + ')'],
    ['Пришли (гостей)', '=SUMIFS(' + L + 'D2:D,' + L + 'H2:H,"да",' + notRepeat + ')']
  ]);
  t.getRange('D3:D4').setFontWeight('bold');
  t.getRange('A3:A6').setFontWeight('bold');
  t.getRange('B3:B4').setFontWeight('bold').setFontSize(14);

  t.getRange('A8:C8').setValues([['Источник', 'Заявок', 'Гостей']])
    .setFontWeight('bold').setBackground('#121418').setFontColor('#FFFFFF');
  var rows = SOURCES.map(function (src, i) {
    var r = 9 + i;
    return [src,
      '=COUNTIFS(' + L + 'E2:E,A' + r + ',' + notRepeat + ')',
      '=SUMIFS(' + L + 'D2:D,' + L + 'E2:E,A' + r + ',' + notRepeat + ')'];
  });
  t.getRange(9, 1, rows.length, 3).setValues(rows);
  var last = 9 + rows.length;
  t.getRange(last, 1, 1, 3).setValues([['Всего', '=SUM(B9:B' + (last - 1) + ')', '=SUM(C9:C' + (last - 1) + ')']])
    .setFontWeight('bold');
  t.setColumnWidth(1, 260);
  t.setColumnWidths(2, 2, 110);
  t.setColumnWidth(4, 160);
}


// ===================== Админка =====================

/** Запросы из admin.html: список заявок, отметка «пришёл», удаление. Всё — только с паролем. */
function admin_(d) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('admin_fails') || 0);
  if (fails >= 10) return { ok: false, error: 'locked' };   // 10 неверных паролей — пауза 10 минут
  if (!passwordOk_(String(d.key || ''))) {
    cache.put('admin_fails', String(fails + 1), 600);
    return { ok: false, error: 'password' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = setup();
    if (d.op === 'checkin') {
      var row = parseInt(d.row, 10);
      if (!(row >= 2 && row <= sheet.getLastRow())) return { ok: false, error: 'row' };
      if (String(sheet.getRange(row, 7).getValue()) !== String(d.id)) return { ok: false, error: 'moved' };
      sheet.getRange(row, 8).setValue(d.came ? 'да' : '');
    } else if (d.op === 'delete') {
      var r = parseInt(d.row, 10);
      if (!(r >= 2 && r <= sheet.getLastRow())) return { ok: false, error: 'row' };
      if (String(sheet.getRange(r, 7).getValue()) !== String(d.id)) return { ok: false, error: 'moved' };
      sheet.deleteRow(r);
    }
    return { ok: true, leads: listLeads_(sheet), now: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function passwordOk_(key) {
  if (!key) return false;
  if (ADMIN_PASSWORD) return key === ADMIN_PASSWORD;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'woodnext-open-day-2026:' + key, Utilities.Charset.UTF_8);
  var hex = bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  return hex === ADMIN_HASH;
}

function listLeads_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues().map(function (r, i) {
    return {
      row: i + 2,
      time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]).replace(/^'/, ''),
      phone: String(r[2]),
      guests: Number(r[3]) || 0,
      source: String(r[4]),
      repeat: r[5] === 'да',
      id: String(r[6]),
      came: r[7] === 'да'
    };
  }).filter(function (x) { return x.name || x.phone; });
}


// ===================== Вспомогательные =====================

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (ignore) {}
  }
  return (e && e.parameter) || {};
}

function validate_(d) {
  var name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  var digits = String(d.phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.charAt(0) === '8') digits = '7' + digits.slice(1);
  var guests = parseInt(d.guests, 10);
  var source = SOURCES.indexOf(String(d.source)) >= 0 ? String(d.source) : 'Не указано';
  var id = String(d.id || '').replace(/[^\w-]/g, '').slice(0, 40) || Utilities.getUuid();

  if (name.length < 2) return { error: 'name' };
  if (digits.length !== 11 || digits.charAt(0) !== '7') return { error: 'phone' };
  if (!(guests >= 1 && guests <= 6)) return { error: 'guests' };

  // Защита от «формул» в таблице: текст, начинающийся с = + - @, превращаем в обычный
  if (/^[=+\-@]/.test(name)) name = "'" + name;

  var phone = '+7 (' + digits.substr(1, 3) + ') ' + digits.substr(4, 3) + '-' + digits.substr(7, 2) + '-' + digits.substr(9, 2);
  return { name: name, phone: phone, guests: guests, source: source, id: id };
}

function lastRows_(sheet, col, count) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var from = Math.max(2, last - count + 1);
  return sheet.getRange(from, col, last - from + 1, 1).getValues().map(function (r) { return String(r[0]); });
}

function idExists_(sheet, id) {
  return lastRows_(sheet, 7, 200).indexOf(id) >= 0;
}

function phoneExists_(sheet, phone) {
  return lastRows_(sheet, 3, 5000).indexOf(phone) >= 0;
}

function getTotals_(sheet) {
  var last = sheet.getLastRow();
  var res = { leads: 0, guests: 0 };
  if (last < 2) return res;
  sheet.getRange(2, 4, last - 1, 3).getValues().forEach(function (r) {
    if (r[2] === 'да') return;            // повтор номера не считаем
    res.leads += 1;
    res.guests += Number(r[0]) || 0;
  });
  return res;
}

function notifyTelegram_(lead, repeat, totals) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  var time = Utilities.formatDate(new Date(), TZ, 'dd.MM.yyyy HH:mm');
  var text = [
    '🏡 <b>Новая заявка — День открытых дверей</b>',
    '',
    '👤 ' + esc_(lead.name.replace(/^'/, '')),
    '📞 ' + esc_(lead.phone),
    '👥 Человек: <b>' + lead.guests + '</b>',
    '📣 Источник: ' + esc_(lead.source),
    '🕒 ' + time,
    repeat ? '\n⚠️ Этот номер уже записывался — в итог заявка не добавлена.' : '',
    '',
    '<b>Всего записано: ' + totals.guests + ' ' + plural_(totals.guests, ['человек', 'человека', 'человек']) +
      ' (' + totals.leads + ' ' + plural_(totals.leads, ['заявка', 'заявки', 'заявок']) + ')</b>'
  ].join('\n');
  sendTelegram_(text);
}

function sendTelegram_(text) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'HTML', disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) console.error('Telegram: ' + res.getContentText());
  return res;
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function plural_(n, f) {
  var a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return f[0];
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return f[1];
  return f[2];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


// ===================== Проверка вручную =====================

/** Отправляет тестовое сообщение в Telegram. Запустите из редактора. */
function testTelegram() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error('Заполните TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID вверху файла');
  var res = sendTelegram_('✅ Бот WOODNEXT подключён. Сюда будут приходить заявки на День открытых дверей.');
  console.log(res.getResponseCode() + ' ' + res.getContentText());
}

/**
 * Помогает узнать chat_id: напишите что-нибудь в чат с ботом (или в группу, куда он добавлен),
 * затем запустите эту функцию и посмотрите «Журнал выполнения».
 */
function findChatId() {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('Сначала вставьте TELEGRAM_BOT_TOKEN');
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/getUpdates', { muteHttpExceptions: true });
  var data = JSON.parse(res.getContentText());
  var seen = {};
  (data.result || []).forEach(function (u) {
    var m = u.message || u.channel_post || u.my_chat_member || {};
    var chat = m.chat;
    if (chat && !seen[chat.id]) {
      seen[chat.id] = true;
      console.log('chat_id: ' + chat.id + '  —  ' + (chat.title || chat.first_name || '') + ' (' + chat.type + ')');
    }
  });
  if (!Object.keys(seen).length) console.log('Пусто. Напишите сообщение в чат с ботом и запустите ещё раз.');
}

/** Добавляет тестовую заявку, как будто она пришла с сайта. Потом удалите строку вручную. */
function testLead() {
  var res = doPost({ postData: { contents: JSON.stringify({
    name: 'Тест', phone: '+7 (900) 000-00-00', guests: 2, source: 'Telegram', id: 'test-' + Date.now(), elapsed: 30
  }) } });
  console.log(res.getContent());
}
