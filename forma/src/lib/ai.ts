// Общая часть ввода через ИИ: схема ответа, промпты, фото. Провайдеры — gemini.ts и claude.ts.

import * as z from 'zod/v4';
import type { Day, FormaData } from '../types';
import type { Settings } from '../storage';
import { GROUPS, averages, recovery, sortedBench, sortedWeight, e1rm } from './calc';
import { WDF, daysBetween, longD, wdName } from './format';
import { aboutUser, goalText, userName } from './profile';
import { AdviceSchema, type Advice } from './advice';
import { geminiEntry, geminiStructured, geminiText } from './gemini';

const GROUP_KEYS = GROUPS.map(g => g.k) as [string, ...string[]];

export const EntrySchema = z.object({
  date: z.string().describe('Дата записи YYYY-MM-DD. По умолчанию сегодня; «вчера» — вчерашняя дата.'),
  food: z.array(z.object({
    name: z.string().describe('Короткое название по-русски, с уточнением: «Курица готовая», «Макароны Макфа, сухие»'),
    grams: z.number().nullable().describe('Съеденный вес в граммах или null, если штучно/неизвестно'),
    p: z.number(), f: z.number(), c: z.number(), kcal: z.number(), fib: z.number(),
    source: z.enum(['label', 'base', 'estimate']).describe('label — с этикетки на фото, base — справочник/правила, estimate — оценка'),
    product: z.string().nullable().describe('Точное название из справочника частых продуктов, если это он, иначе null'),
    note: z.string().nullable().describe('Короткая пометка, например «вычел 2 желтка», или null'),
  })),
  exercises: z.array(z.object({
    name: z.string(),
    group: z.enum(GROUP_KEYS).nullable(),
    isBench: z.boolean().describe('true только для жима штанги лёжа'),
    sets: z.array(z.object({ weight: z.number().nullable(), reps: z.number() })),
  })),
  weight: z.number().nullable().describe('Вес тела в кг, если назван'),
  supps: z.boolean().nullable().describe('true, если сказал, что пил добавки'),
  gym: z.boolean().nullable().describe('true, если был в зале'),
  sore: z.array(z.enum(GROUP_KEYS)).describe('Группы мышц, про которые сказал «ещё болит»'),
  questions: z.array(z.string()).describe('Уточняющие вопросы, без которых расчёт неточный. Пусто, если всё ясно'),
  comment: z.string().describe('1–2 коротких предложения: что записал и на что обратить внимание'),
});
export type Entry = z.infer<typeof EntrySchema>;

// Системный промпт не меняется от запроса к запросу — так он кэшируется и стоит дешевле.
/** Фастфуд: модели (особенно Flash-Lite) без ориентиров ставили нули или отказывались считать. */
const FAST_FOOD = `- Фастфуд и кафе (KFC/Rostic's, «Вкусно — и точка», Бургер Кинг, Додо, шаурма и т. п.): никогда не ставь нули и не отказывайся считать — бери типичные значения сети (source = "estimate"). Каждое блюдо — отдельная позиция, количество учитывай (3 крылышка = одна позиция «Крылышки острые, 3 шт» с итогом на 3 шт), соус — отдельной позицией. Если название понятно, вопросов не задавай. Ориентиры на 1 шт:
  · крылышко острое KFC/Rostic's (~35 г): Б 7, Ж 6, У 3, 95 ккал
  · Шефбургер оригинальный (~190 г): Б 19, Ж 20, У 44, 440 ккал; Шефбургер Де Люкс (~200 г): Б 25, Ж 26, У 45, 520 ккал
  · ножка/стрипс KFC (1 шт): Б 13, Ж 8, У 6, 150 ккал; баскет из 5 крыльев ≈ 5 крылышек
  · картофель фри: малый ~80 г — 240 ккал (Б 3, Ж 12, У 30); средний ~110 г — 330 ккал (Б 4, Ж 16, У 42); большой ~150 г — 450 ккал (Б 5, Ж 22, У 57)
  · соус сырный (25 г): Б 1, Ж 9, У 2, 90 ккал; кетчуп (25 г): У 6, 25 ккал
  · Биг Хит/Биг Мак: Б 26, Ж 28, У 43, 530 ккал; чизбургер: Б 15, Ж 13, У 31, 300 ккал; Воппер: Б 28, Ж 38, У 50, 660 ккал
  · шаурма с курицей (~350 г): Б 30, Ж 30, У 60, 650 ккал`;

export function systemPrompt(data: FormaData) {
  const t = data.targets;
  const products = data.products
    .map(p => `- ${p.name} (${p.portion}): Б ${p.p}, Ж ${p.f}, У ${p.c}, ${p.kcal} ккал, клетч. ${p.fib ?? 0}${p.note ? ' — ' + p.note : ''}`)
    .join('\n');
  return `Ты ведёшь дневник питания и тренировок в приложении «Форма». Пользователь пишет коротко, по-русски, часто с опечатками и голосовым вводом, иногда присылает фото этикеток. Твоя задача — превратить сообщение в структурированную запись.

О пользователе: ${aboutUser(data)} Нормы в день: ${t.kcal} ккал, белок ≥ ${t.p} г, жиры до ~${t.f} г, углеводы ~${t.c} г, клетчатка ${t.fib} г.

Правила расчёта КБЖУ (соблюдай):
- Этикетка важнее базы: если на фото есть КБЖУ с упаковки — бери с неё и пересчитывай на съеденный вес (source = "label").
- Макароны: если не сказано, сухой или готовый вес — задай вопрос в questions, а в расчёте прими готовый вес. Готовые ≈ в 2,5 раза тяжелее сухих. Сухие (Макфа) на 100 г: Б 12, Ж 1,3, У 70,5, 342 ккал. Готовые: Б 3,5, Ж 0,5, У 25, 130 ккал. «Пачка» = 450–500 г сухих, уточни.
- Курица/грудка готовая на 100 г: Б 30, Ж 3,5, 165 ккал. Сырая ≈ Б 23.
- Яйца: категория важна (С0 крупнее, ~65 г). Если не съел желтки — вычти их и отметь в note.
- Если блюдо приготовлено на весь день или на несколько человек — считай только съеденную часть.
- Если продукт есть в справочнике ниже — бери его значения на порцию (source = "base") и укажи его точное название в product.
${FAST_FOOD}
- Клетчатку оценивай примерно, не пропускай.
- Числа округляй до целых (вес продукта и КБЖУ).

Тренировки:
- Каждое упражнение — отдельная запись, группа мышц из списка: ${GROUP_KEYS.join(', ')}. Если упражнение не про эти группы (пресс, кардио) — group = null.
- «Жим 70 на 5» — это подходы: weight 70, reps 5. Жим штанги лёжа помечай isBench = true. Жим гантелей и тренажёры — isBench = false.
- Если перечислены упражнения — значит был в зале: gym = true.
- «Ещё болит грудь» → sore = ["грудь"].

Добавки: «добавки пил», «выпил креатин» → supps = true.

Если в сообщении нет чего-то из разделов — оставь пустой список или null. Не придумывай того, чего не было, но КБЖУ съеденного считай всегда: если сомневаешься в весе или составе — оцени по типичной порции (source = "estimate") и задай короткий вопрос. Нули в КБЖУ у реальной еды недопустимы.

Справочник частых продуктов (значения на порцию):
${products}`;
}

export function dayContext(day: Day | undefined) {
  if (!day) return 'Записей за этот день пока нет.';
  const parts = [];
  if (day.food?.length) parts.push('Еда: ' + day.food.join('; '));
  if (day.meals?.length) parts.push('Уже записано: ' + day.meals.map(m => m.name + (m.grams ? ` ${m.grams} г` : '')).join('; '));
  if (day.exercises?.length) parts.push('Упражнения: ' + day.exercises.map(e => e.name).join('; '));
  if (day.macros) parts.push(`Итог дня сейчас: Б ${day.macros.p}, Ж ${day.macros.f}, У ${day.macros.c}, ${day.macros.kcal} ккал`);
  return parts.join('\n') || 'Записей за этот день пока нет.';
}

export class AiError extends Error {}

export interface ChatTurn { role: 'user' | 'assistant'; text: string }

export interface ImageInput { mediaType: 'image/jpeg'; data: string }

/** Текст запроса: дата, что уже записано за день, сообщение пользователя. */
export function entryUserText(data: FormaData, today: string, text: string) {
  const y = new Date(today + 'T12:00:00');
  y.setDate(y.getDate() - 1);
  const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  return `Сегодня ${today} (${longD(today)}, ${wdName(today)}). Вчера было ${yk}.\n` +
    `Что уже записано сегодня:\n${dayContext(data.days.find(d => d.date === today))}\n\n` +
    `Сообщение:\n${text || '(только фото)'}`;
}

export const verdictSystem = (data: FormaData) => `Ты пишешь короткий «вывод дня» для дневника питания и тренировок. Пользователь: ${aboutUser(data)} 2–3 предложения по-русски, на «ты»: что хорошо, что подтянуть завтра. Честно указывай на проблемы (перебор жира, мало белка или калорий), но без занудства и без списков. Только сам вывод, без заголовков.`;

export function verdictUserText(data: FormaData, day: Day) {
  const t = data.targets, m = day.macros;
  return [
    `День ${longD(day.date)}, ${wdName(day.date)}.`,
    dayContext(day),
    day.training?.length ? 'Тренировка: ' + day.training.join('; ') : '',
    m ? `Итог: Б ${m.p} г, Ж ${m.f} г, У ${m.c} г, ${m.kcal} ккал, клетчатка ${m.fib ?? 0} г.` : 'КБЖУ не посчитаны.',
    `Цели: ${t.kcal} ккал, белок ≥ ${t.p}, жиры до ~${t.f}, углеводы ~${t.c}, клетчатка ${t.fib}. Цель — ${goalText(data)}.`,
  ].filter(Boolean).join('\n');
}

export const hasKey = (s: Settings) => (s.provider === 'claude' ? !!s.apiKey : !!s.geminiKey);

export async function parseEntry(opts: { settings: Settings; data: FormaData; today: string; text: string; image?: ImageInput }): Promise<Entry> {
  const sys = systemPrompt(opts.data), user = entryUserText(opts.data, opts.today, opts.text);
  if (opts.settings.provider === 'claude') {
    const { claudeEntry } = await import('./claude');
    return claudeEntry(opts.settings, sys, user, opts.image);
  }
  return geminiEntry(opts.settings, sys, user, opts.today, opts.image);
}

export async function dayVerdict(opts: { settings: Settings; data: FormaData; day: Day }): Promise<string> {
  const user = verdictUserText(opts.data, opts.day);
  if (opts.settings.provider === 'claude') {
    const { claudeText } = await import('./claude');
    return claudeText(opts.settings, verdictSystem(opts.data), user);
  }
  return geminiText(opts.settings, verdictSystem(opts.data), user);
}

/** Сжимает фото до 1568 px по длинной стороне — так дешевле и быстрее. */
export async function prepareImage(file: File): Promise<ImageInput> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.85);
  return { mediaType: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
}

// ---- Советник: чат с ИИ, который видит дневник ----

/** Сводка дневника для советника: профиль, цели, последние 14 дней, вес, жим, мышцы. */
export function advisorContext(data: FormaData, today: string) {
  const t = data.targets;
  const av = averages(data);
  // Все дни (до 60 последних) со всеми полями и номерами — чтобы советник видел дневник целиком и мог править любую часть.
  const days = data.days.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-60).map(d => {
    const m = d.macros;
    const mk = data.marks[d.date];
    const bench = data.bench.filter(b => b.date === d.date);
    const w = data.weight.find(x => x.date === d.date);
    const parts = [
      `=== ${d.date} (${wdName(d.date)})${d.partial ? ' [не закрыт]' : ' [закрыт]'}`,
      mk ? `Отметки: добавки ${mk.p ? '✓' : '—'}, зал ${mk.g ? '✓' : '—'}` : '',
      d.work ? `Описание дня (work): ${d.work}` : '',
      w ? `Вес: ${w.value} кг` : '',
      m ? `Итог дня (macros): Б ${m.p} Ж ${m.f} У ${m.c} ${m.kcal} ккал клетч. ${m.fib ?? 0}` : '',
      ...(d.food || []).map((x, i) => `Строка еды food[${i}]: ${x}`),
      ...(d.meals || []).map((x, i) => `Еда записано в приложении #${i}: ${x.name}${x.grams ? ` ${x.grams} г` : ''} (Б ${x.p} Ж ${x.f} У ${x.c} ${x.kcal} ккал клетч. ${x.fib})`),
      d.groups?.length ? `Группы мышц (groups): ${d.groups.join(', ')}` : '',
      ...(d.training || []).map((x, i) => `Строка тренировки training[${i}]: ${x}`),
      ...(d.exercises || []).map((x, i) => `Упражнение #${i}: ${x.name} [${x.group ?? 'без группы'}]: ` + (x.sets.length ? x.sets.map(s => (s.weight != null ? s.weight + '×' : '') + s.reps).join(', ') : 'подходы не указаны')),
      ...bench.map((b, i) => `Жим штанги подход #${i}: ${b.w}×${b.r}`),
      d.trainNote ? `Заметка о тренировке (trainNote): ${d.trainNote}` : '',
      d.supps ? `Добавки (supps): ${d.supps}` : '',
      d.verdict ? `Вывод дня (verdict): ${d.verdict}` : '',
    ];
    return parts.filter(Boolean).join('\n');
  }).join('\n');
  const muscles = GROUPS.map(g => {
    const r = recovery(data, g, today);
    return r ? `${g.l}: ${r.ago} дн. назад, ${r.txt}` : `${g.l}: не было`;
  }).join('; ');
  const sober = data.soberSince ? daysBetween(data.soberSince, today) : null;
  return [
    `Сегодня ${today}, ${wdName(today)}.`,
    `Цели в день: ${t.kcal} ккал, белок ≥ ${t.p} г, жиры до ~${t.f} г, углеводы ~${t.c} г, клетчатка ${t.fib} г. Цель — ${goalText(data)}.`,
    av ? `Среднее по ${av.n} закрытым дням: ${Math.round(av.avg.kcal)} ккал, Б ${Math.round(av.avg.p)}, Ж ${Math.round(av.avg.f)}, У ${Math.round(av.avg.c)}, клетч. ${Math.round(av.avg.fib)}.` : '',
    data.weight.length ? `Вес: ${sortedWeight(data).map(w => `${w.date} ${w.value}`).join(', ')}.` : 'Взвешиваний пока нет.',
    data.bench.length ? `Жим штанги лёжа: ${sortedBench(data).map(b => `${b.date} ${b.w}×${b.r} (расч. макс ${e1rm(b)})`).join(', ')}.` + (data.benchMax ? ` Текущий примерный максимум ${data.benchMax} кг.` : '') + (data.oldBenchMax ? ` До перерыва было ${data.oldBenchMax}.` : '') : '',
    Object.keys(data.split).length ? `План тренировок: ${Object.entries(data.split).map(([d, v]) => WDF[+d] + ' — ' + v).join('; ')}.` : 'Плана тренировок нет.',
    `Восстановление мышц сегодня (большим группам нужно 3 дня, рукам 2): ${muscles}.`,
    data.supplements.length ? `Добавки: ${data.supplements.map(s => s.time + ': ' + s.items).join(' | ')}.` : '',
    sober != null ? `Без алкоголя ${sober} дн. (с ${data.soberSince}).` : '',
    data.products.length && `Частые продукты: ${data.products.map(p => `${p.name} (${p.portion}: Б ${p.p} Ж ${p.f} У ${p.c} ${p.kcal} ккал)`).join('; ')}.`,
    data.profile ? `Анкета: ${data.profile.name}, ${data.profile.sex === 'f' ? 'жен' : 'муж'}, возраст ${data.profile.age ?? '?'}, рост ${data.profile.height ?? '?'} см, вес в анкете ${data.profile.weight ?? '?'} кг, цель ${data.profile.goal}. О себе: ${data.profile.note || '—'}` : '',
    Object.keys(data.sore).length ? `Отметки «ещё болит» (sore): ${Object.entries(data.sore).map(([g, d]) => `${g} с ${d}`).join(', ')}.` : 'Отметок «ещё болит» нет.',
    `Дневник по дням (${Math.min(data.days.length, 60)} дн.):\n${days}`,
  ].filter(Boolean).join('\n');
}

const advisorSystem = (data: FormaData) => `Ты — личный советник по питанию, тренировкам и восстановлению в приложении «Форма». Пользователь: ${aboutUser(data)} Пишет коротко, по-русски, иногда с опечатками.

Отвечай по-русски, на «ты», коротко и по делу: обычно 2–6 предложений или короткий список. Отвечай ровно на заданный вопрос: если спрашивают про конкретный приём пищи или блюдо — дай КБЖУ именно по нему (по каждой позиции и итог), а не итог дня; итог дня — только если спросили или одной строкой после. Опирайся на его данные ниже и называй конкретные цифры и продукты, которые он реально ест. Честно указывай на проблемы (перебор жира, мало белка, калории не под цель), но без занудства. Не выдумывай данные, которых нет. Ты не врач: при боли в суставах, травмах или тревожных симптомах советуй обратиться к врачу. Без таблиц и заголовков.

Как устроено приложение «Форма» (ты видишь все эти данные ниже и можешь менять их через actions):
- «Обзор»: последний вес и график веса, жим (максимум benchMax и последний подход), счётчики тренировок/дней с добавками/дней в дневнике, «Без алкоголя» (soberSince), средние КБЖУ по закрытым дням, ближайшая тренировка по плану, схема добавок, последний вывод дня.
- «Жим»: все подходы жима штанги лёжа (bench) и график; максимум — benchMax.
- «Календарь»: по каждому дню — отметки добавки/зал, буквы групп мышц (groups), карточка дня: описание, вес, жим, еда, тренировка, добавки, БЖУ, вывод. Там же закрыть день.
- «Тренировки»: «Восстановление мышц» — считается по датам дней, где в groups есть эта группа (большим группам нужно 3 дня, рукам 2), отметка «ещё болит» (sore) важнее на 2 дня; ниже история тренировок: группы, упражнения, заметка (trainNote).
- «Дневник»: все дни подряд.
- ⚙: анкета (profile), нормы (targets), план тренировок по дням недели (split), «о себе» (note), добавки.
Когда что-то меняешь, говори, где это будет видно (например: «отметка в Тренировки → Восстановление мышц, на 2 дня»). Если тебя спрашивают, что где записано, — смотри данные ниже и отвечай конкретно с датой и вкладкой, ничего не придумывай.
Старые строки из чата (food[i], training[i], work, supps, trainNote, verdict) меняй через set_day_text — присылай ВЕСЬ новый список строк; если меняешь строки еды, следом пришли set_day_macros с новым итогом дня. Позиции «записано в приложении #N» и «Упражнение #N» меняй через update_food / update_exercise или удаляй через remove_*.

Ты можешь менять дневник: в поле actions предложи конкретные изменения, если пользователь о них просит или если явно нашёл ошибку (неверный вес, лишняя запись, незакрытый прошедший день, нормы не под цель). Каждое изменение пользователь подтвердит кнопкой — в reply коротко скажи, что предлагаешь. Если ничего менять не нужно — actions пустой. В истории после твоих ответов в скобках указано, что стало с прошлыми предложениями: применённые и пропущенные не предлагай снова. Перед add_food и add_exercise проверь дневник за эту дату: если такое упражнение или блюдо там уже есть (в строках или в «упражнение #N» / «записано в приложении #N») — не предлагай его снова. Упражнения добавляй, только если пользователь сам сказал, что их сделал; не предлагай упражнения как совет. Нерешённые повторяй, только если они по-прежнему нужны и связаны с новым вопросом; на простой вопрос (например, «сколько вышло КБЖУ») не прикладывай старые предложения заново. Для еды считай КБЖУ на съеденный вес, нули у реальной еды недопустимы. Даты — в формате YYYY-MM-DD.

Ориентиры по фастфуду:
${FAST_FOOD}

Долгая память: поле «о себе» (оно есть в описании пользователя выше) ты видишь в каждом разговоре, а переписку — только последние сообщения. Если пользователь рассказал о себе что-то важное надолго (ограничения в еде, травмы и боли, режим дня и тренировок, предпочтения, цели), предложи действие set_note: в text — ВЕСЬ текст «о себе», то есть прежний текст плюс новый факт одной короткой фразой. Ничего из прежнего не удаляй, если пользователь сам не попросил. Разовые события дня туда не пиши.`;

export async function askAdvisor(opts: { settings: Settings; data: FormaData; today: string; history: ChatTurn[] }): Promise<Advice> {
  const system = advisorSystem(opts.data) + `\n\nДанные (${userName(opts.data)}):\n` + advisorContext(opts.data, opts.today);
  // История должна начинаться с вопроса пользователя.
  const turns = opts.history.slice(-20);
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (opts.settings.provider === 'claude') {
    const { claudeStructured } = await import('./claude');
    return claudeStructured(opts.settings, system, turns, AdviceSchema);
  }
  return geminiStructured(opts.settings, system, turns, AdviceSchema);
}
