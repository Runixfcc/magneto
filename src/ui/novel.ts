/**
 * Story & Visual Novel Engine for Magnetic Master
 * Implements full narrative campaign from Story_Magnetic_Master.md
 */

import { SFXManager } from '../audio/sfx';
import { TrackedHands } from '../tracking/handTracker';
import { GestureState } from '../gestures/gestureManager';

export type SpeakerId = 'charles' | 'young_erik' | 'erik' | 'magda' | 'voice' | 'narrator';

export interface DialogueLine {
  speaker: SpeakerId;
  speakerName: string;
  text: string;
  background?: string;
  sound?: 'psychic' | 'metal' | 'normal' | 'camp_alarm' | 'heartbeat' | 'puppet_snap';
  emotion?: 'neutral' | 'urgent' | 'intense';
}

export interface StoryChapter {
  id: string;
  title: string;
  subtitle: string;
  background: string;
  lines: DialogueLine[];
  practicePrompt?: {
    icon: string;
    title: string;
    description: string;
    stepType: 'throw' | 'lock' | 'shield' | 'battle' | 'escape' | 'heroes' | 'ultimatum';
  };
}

export const STORY_CHAPTERS: StoryChapter[] = [
  // =========================================================================
  // 1. CHAPTER 1: Нюрнберг, 1930-е. Копьё (Обучение броску)
  // =========================================================================
  {
    id: 'chapter_1',
    title: 'МИССИЯ 1. «КОПЬЁ»',
    subtitle: 'Нюрнберг, 1930-е годы. Память о первом броске.',
    background: '/assets/nuremberg.jpg',
    lines: [
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер (телепатически)',
        text: 'Начнём с самого простого, Эрик. Что ты помнишь первым?',
        sound: 'psychic'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс (юность)',
        text: 'Школьный стадион в Нюрнберге... Соревнования по метанию копья. Я обошёл их лучших учеников.',
        sound: 'normal'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс (юность)',
        text: 'Директор не поверил, что еврейский мальчик мог превзойти их «арийцев». Он заставил меня бросать снова тяжёлым стальным копьём... и я снова победил.',
        sound: 'normal'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Тогда вспомни это чувство! Наведи левую руку на цель, сожми правый кулак, чтобы схватить снаряд, и резко раскрой ладонь для броска!',
        sound: 'psychic',
        emotion: 'urgent'
      }
    ],
    practicePrompt: {
      icon: '🎯',
      title: 'Бросок турнирного копья',
      description: 'Наведи прицел левой рукой, сожми правый кулак (или зажми ЛКМ) и резко раскрой ладонь, чтобы поразить 5 мишеней!',
      stepType: 'throw'
    }
  },

  // =========================================================================
  // 2. INTERLUDE 1: 1938–1944. «ХОЛОДНЫЙ ПЕПЕЛ» (Кинематографический филлер)
  // =========================================================================
  {
    id: 'interlude_1',
    title: 'ЭКСПОЗИЦИЯ: «ХОЛОДНЫЙ ПЕПЕЛ»',
    subtitle: '1938–1944. От Хрустальной ночи до ворот Освенцима.',
    background: '/assets/oswiecim.jpg',
    lines: [
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Я чувствую, как холодеет твоя кровь на Аракко, Эрик... Что произошло после той юношеской победы на стадионе?',
        sound: 'psychic'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс (воспоминание)',
        text: 'Всё рухнуло. Ноябрь тридцать восьмого... Хрустальная ночь. Осколки витрин наших магазинов на мостовой в Берлине. Звон разбитого стекла, который я помню до сих пор.',
        sound: 'metal'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс (воспоминание)',
        text: 'Потом — приказ носить жёлтые звёзды Давида на пальто. Они превратили нас в живые мишени прямо посреди бела дня.',
        sound: 'normal'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс (воспоминание)',
        text: 'В сорок четвёртом нас загнали в товарные вагоны для скота. Трое суток в глухой темноте, без глотка воды и воздуха, пока поезд не заскрежетал тормозами у рампы Биркенау.',
        sound: 'normal'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Рампа селекции... Там тебя силой вырвали из рук матери.',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс (воспоминание)',
        text: 'Их увели в газовые камеры. А меня бросили в подземные лаборатории доктора Шмидта. Он требовал гнуть монеты и двигать сталь, ломая мне кости.',
        sound: 'normal'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс (воспоминание)',
        text: 'Он думал, что боль рождает силу. Но боль рождала только ненависть. И в один день эта ненависть нашла свой выход...',
        sound: 'metal',
        emotion: 'intense'
      }
    ]
  },

  // =========================================================================
  // 3. CHAPTER 2: Освенцим, 1944. «ЗАМОК» (Пробуждение магнитной ярости)
  // =========================================================================
  {
    id: 'chapter_2',
    title: 'МИССИЯ 2. «ЗАМОК»',
    subtitle: 'Освенцим, конец войны. Первое пробуждение магнитной силы.',
    background: '/assets/lock_door.jpg',
    lines: [
      {
        speaker: 'magda',
        speakerName: 'Магда (в отчаянии за дверью)',
        text: 'Макс! Дверь заперта на цепи и броневой замок! Охрана бежит сюда, помоги мне!..',
        sound: 'normal',
        emotion: 'urgent'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс',
        text: 'Сталь... толстая бронированная крупповская сталь. Я не смогу открыть её голыми руками!',
        sound: 'normal',
        emotion: 'intense'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Не смотри на замок глазами, Эрик! Почувствуй его атомы. Он металл. Ты умеешь говорить с железом!',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Сожми ОБЕ руки в кулаки перед собой и с максимальной силой рвани их на себя! Сокруши этот замок силой мысли!',
        sound: 'psychic',
        emotion: 'intense'
      }
    ],
    practicePrompt: {
      icon: '🔒',
      title: 'Взлом Замка: Двуручный рывок',
      description: 'Сожми ОБА кулака перед камерой (или зажми ЛКМ+ПКМ / Пробел) и резко дёрни на себя 3–4 раза!',
      stepType: 'lock'
    }
  },

  // =========================================================================
  // 4. INTERLUDE 2: 1944. «КРАСНАЯ НОЧЬ ОСВЕНЦИМА» (Экспозиция перед побегом)
  // =========================================================================
  {
    id: 'interlude_2',
    title: 'ЭКСПОЗИЦИЯ: «КРАСНАЯ НОЧЬ ОСВЕНЦИМА»',
    subtitle: '1944 год. Вой сирен и прорыв через лагерный коридор.',
    background: '/assets/oswiecim.jpg',
    lines: [
      {
        speaker: 'young_erik',
        speakerName: 'Макс',
        text: 'Стальные цепи лопнули! Броневой замок вырван с корнем! Магда на свободе!',
        sound: 'metal',
        emotion: 'intense'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Но грохот разбудил весь гарнизон лагеря! Слышишь этот вой?!',
        sound: 'camp_alarm',
        emotion: 'urgent'
      },
      {
        speaker: 'young_erik',
        speakerName: 'Макс',
        text: 'Сирены... Прожекторы с вышек заливают дорогу белым огнём. Охрана взводит карабины!',
        sound: 'camp_alarm'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Северные ворота — единственный путь наружу! До них шестьдесят метров по открытой дороге!',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Вокруг лежат тонны металла: каски, трубы, обломки бараков! Поднимай их в воздух! Пусть железо станет твоим щитом и оружием!',
        sound: 'psychic',
        emotion: 'intense'
      }
    ]
  },

  // =========================================================================
  // 5. CHAPTER 3: Освенцим. «ПОБЕГ» (Прорыв к северным воротам)
  // =========================================================================
  {
    id: 'chapter_3',
    title: 'МИССИЯ 3. «ПОБЕГ»',
    subtitle: 'Освенцим. Прорыв через лагерный коридор к воротам свободы.',
    background: '/assets/oswiecim.jpg',
    lines: [
      {
        speaker: 'young_erik',
        speakerName: 'Макс',
        text: 'Я вижу ворота сквозь туман и прожекторы! Но нацистский караул открыл огонь на поражение!',
        sound: 'normal',
        emotion: 'urgent'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Эрик, беги вперед к воротам лагеря (клавиши W / Стрелка вверх или жест ☝️)! Не останавливайся ни на секунду!',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Хватай летящие пули и металл силой мысли, сметай караул с пути! Доберись до ворот и вырвись на свободу!',
        sound: 'psychic',
        emotion: 'intense'
      }
    ],
    practicePrompt: {
      icon: '🏃',
      title: 'Прорыв к воротам лагеря',
      description: 'Беги вперед к воротам лагеря (W / Стрелка вверх или жест ☝️), хватай и метай металл во врагов. Доберись до конца и выживи!',
      stepType: 'escape'
    }
  },

  // =========================================================================
  // 6. INTERLUDE 3: «ПЕПЕЛ ДЕСЯТИЛЕТИЙ И ТЕНЬ АРАККО» (Филлер перед Миссией 4)
  // =========================================================================
  {
    id: 'interlude_3',
    title: 'ЭКСПОЗИЦИЯ: «ПЕПЕЛ ДЕСЯТИЛЕТИЙ И ТЕНЬ АРАККО»',
    subtitle: '1945–2026. Падение сердца на Марсе и астральное вторжение.',
    background: '/assets/arakko.jpg',
    lines: [
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Ты вырвался тогда, Эрик... Десятилетия битв за будущее мутантов. Братство, наши вечные споры, Астероид М, создание Кракоа...',
        sound: 'psychic'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето (взрослый)',
        text: 'А теперь мы на Марсе. На песках Аракко. Вечные обрушили на нас свой гнев. Их древний титан Уранос... он голыми руками вырвал моё сердце из груди.',
        sound: 'heartbeat',
        emotion: 'intense'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Ты отказался от резервных копий Церебро, чтобы умереть воином Аракко. Твоё физическое тело на грани смерти, но это ещё не конец!',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'voice',
        speakerName: 'Астральный Кукловод (паразит разума)',
        text: 'Какая трогательная связь братьев... Но этот умирающий сосуд теперь подвластен мне!',
        sound: 'puppet_snap',
        emotion: 'intense'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Что это?! Кровавые пси-нити оплетают мои запястья! Мои руки... чужая воля сжимает мои пальцы!',
        sound: 'heartbeat',
        emotion: 'urgent'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Эрик! Это астральный паразит Ураноса! Пока твоё сердце не бьётся, он проник в твой двигательный центр, чтобы обратить твою мощь против нас! Войди в Астральный План! Разорви его нити!',
        sound: 'psychic',
        emotion: 'intense'
      }
    ]
  },

  // =========================================================================
  // 7. CHAPTER 4: Астральный План. «МАРИОНЕТКА» (Битва за свободу воли)
  // =========================================================================
  {
    id: 'chapter_4',
    title: 'МИССИЯ 4. «МАРИОНЕТКА»',
    subtitle: 'Астральный план разума. Сокрушение Астрального Кукловода.',
    background: '/assets/mindscape.jpg',
    lines: [
      {
        speaker: 'voice',
        speakerName: 'Астральный Кукловод',
        text: 'Твой разум — моя сцена, Магнето! Твоя магнитная мощь разрушит этот мир!',
        sound: 'puppet_snap',
        emotion: 'intense'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Ни один бог и ни один титан не смеет надевать на меня цепи!',
        sound: 'metal',
        emotion: 'intense'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Эрик! Когда он сжимает нити — сожми оба кулака вместе и с яростью РАЗОРВИ РУКИ В СТОРОНЫ (⚡ Магнитный Разрыв: клавиша Т)! Это разорвёт кровавые нити и нанесёт ему чудовищный урон!',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'А когда вокруг сомкнутся его спектральные фантомы — раскинь ладони и с хлопком сведи их (💥 Кинетическая Имплозия: клавиша Q)! Сокруши паразита его же осколками!',
        sound: 'psychic',
        emotion: 'intense'
      }
    ],
    practicePrompt: {
      icon: '⚡',
      title: 'Битва с Астральным Кукловодом',
      description: 'Разорви нити контроля (клавиша T / разведи кулаки), сотри фантомов имплозией (клавиша Q / хлопок ладонями) и уничтожь босса!',
      stepType: 'battle'
    }
  },

  // =========================================================================
  // 8. INTERLUDE 4: «РАЗОРВАННЫЕ НИТИ» (Освобождение сознания и связь братьев)
  // =========================================================================
  {
    id: 'interlude_4',
    title: 'ЭКСПОЗИЦИЯ: «РАЗОРВАННЫЕ НИТИ»',
    subtitle: 'Астральный план. Освобождение разума и связь братьев.',
    background: '/assets/mindscape.jpg',
    lines: [
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Он... рассыпался. Кровавые нити сгорели дотла. Мои руки... снова подчиняются только мне.',
        sound: 'puppet_snap'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Ты сломал хребет титану в собственном разуме, старый друг. Никто и никогда не сможет подчинить Магнето.',
        sound: 'psychic'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Чарльз... Я чувствую ледяную пустоту в груди. Дыра там, где раньше билось живое сердце.',
        sound: 'heartbeat'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'В твоей крови течёт железо, Эрик. Каждый эритроцит — это металл. Ты качал кровь волей, когда бежал из Освенцима. Ты заставишь её течь и сейчас.',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Мы спорили всю жизнь, Чарльз. О людях, о будущем, о нашей расе...',
        sound: 'normal'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'И всё же мы всегда оставались братьями. Теперь открой глаза. Марс ждёт своего защитника.',
        sound: 'psychic',
        emotion: 'intense'
      }
    ]
  },

  // =========================================================================
  // 9. CHAPTER 5: Марс, Аракко. «ПРОБУЖДЕНИЕ» (Запуск биомагнитного пульса)
  // =========================================================================
  {
    id: 'chapter_5',
    title: 'МИССИЯ 5. «ПРОБУЖДЕНИЕ»',
    subtitle: 'Аракко, Марс. Запуск магнитного сердцебиения.',
    background: '/assets/arakko.jpg',
    lines: [
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Сосредоточься на железе внутри артерий. Раскрой обе ладони к багровому небу Марса и удерживай биомагнитный резонанс!',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Я слышу гул марсианских недр... Я чувствую каждый атом железной руды. Моё сердцебиение — это сам магнетизм!',
        sound: 'heartbeat',
        emotion: 'intense'
      }
    ],
    practicePrompt: {
      icon: '🌟',
      title: 'Биомагнитная Синхронизация',
      description: 'Раскрой обе ладони навстречу камере и удерживай 3 секунды, чтобы запустить искусственное сердцебиение!',
      stepType: 'battle'
    }
  },

  // =========================================================================
  // 10. INTERLUDE 5: «КРАХ МИРНОГО ДИАЛОГА» (Перехват земных каналов)
  // =========================================================================
  {
    id: 'interlude_5',
    title: 'ЭКСПОЗИЦИЯ: «КРАХ МИРНОГО ДИАЛОГА»',
    subtitle: '2026 год. Перехват земных частот и разрыв с Чарльзом.',
    background: '/assets/erik_adult.jpg',
    lines: [
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Эрик... Ты запустил магнитный пульс! Ты жив! Но прошу тебя, оставайся на Аракко...',
        sound: 'psychic'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Что ты скрываешь от меня, Чарльз? Мои сенсоры перехватили глобальные радиоканалы Земли. Почему в Манхэттене объявлено военное положение?',
        sound: 'heartbeat',
        emotion: 'urgent'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Правительства Земли... при поддержке военных корпораций и программ Старка создали новых «Омега-Стражей». Они объявили мутантов вне закона. Начались облавы...',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Облавы?! Спустя восемьдесят лет после Освенцима люди снова строят концлагеря и клеймят наших детей! А их «великие герои» — Мстители — покорно исполняют приказы тиранов?!',
        sound: 'metal',
        emotion: 'intense'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Эрик, насилие только подтвердит их страх! Мы должны продолжать мирный диалог...',
        sound: 'psychic'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Твой диалог был наркозом перед нашей казнью, Чарльз! Я умолял в Нюрнберге, видел пепел моей семьи в печах и строил укрытия на Кракоа. С меня хватит. Моё человеческое сердце мертво. Сегодня расизм людей встретит возмездие!',
        sound: 'metal',
        emotion: 'intense'
      }
    ]
  },

  // =========================================================================
  // 11. CHAPTER 6: Манхэттен. «БИТВА С ГЕРОЯМИ ЗЕМЛИ» (Разгром Мстителей и Стражей)
  // =========================================================================
  {
    id: 'chapter_6',
    title: 'МИССИЯ 6. «БИТВА С ГЕРОЯМИ ЗЕМЛИ»',
    subtitle: 'Манхэттен, Нью-Йорк. Столкновение с Железным Человеком и Капитаном Америкой.',
    background: '/assets/mindscape.jpg',
    lines: [
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Манхэттен... Город железа, стекла и слепой гордыни. Железный Человек и Капитан Америка преградили мне путь. Они думают, что их оружие остановит владыку магнетизма!',
        sound: 'metal',
        emotion: 'intense'
      },
      {
        speaker: 'voice',
        speakerName: 'Железный Человек (по внешней связи)',
        text: 'Стой, Леншерр! Сложи оружие и сдайся властям, иначе мы нейтрализуем тебя силой!',
        sound: 'normal',
        emotion: 'urgent'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Вы смеете грозить мне металлом?! Каждый грамм вашей титановой брони, каждая заклёпка ваших репульсоров подвластны моей воле! Я покажу вам, что значит угнетать мутантов!',
        sound: 'metal',
        emotion: 'intense'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Хватай летящие машины, срывай броневые щиты и возвращай их кинетическую мощь прямо в цель! Сегодня герои Земли падут!',
        sound: 'metal',
        emotion: 'intense'
      }
    ],
    practicePrompt: {
      icon: '🛡️',
      title: 'Сражение с Героями Земли',
      description: 'Сокруши Железного Человека, Капитана Америку и отряды Стражей в Манхэттене!',
      stepType: 'heroes'
    }
  },

  // =========================================================================
  // 12. INTERLUDE 6: «МАНИФЕСТ СВОБОДЫ МУТАНТОВ»
  // =========================================================================
  {
    id: 'interlude_6',
    title: 'ЭКСПОЗИЦИЯ: «МАНИФЕСТ СВОБОДЫ МУТАНТОВ»',
    subtitle: 'Манхэттен. Падение идолов и триумф силы.',
    background: '/assets/erik_adult.jpg',
    lines: [
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Костюм за миллиарды долларов разорван в клочья. Вибраниумовый щит вырван из рук и застыл в воздухе. Где теперь ваше величие, «защитники»?',
        sound: 'metal',
        emotion: 'intense'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер',
        text: 'Эрик, они вызывают сверхтяжёлый резерв... Халка и экспериментальных титанических Стражей! Они готовы сровнять город с землёй, лишь бы уничтожить тебя!',
        sound: 'psychic',
        emotion: 'urgent'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Пусть бросают в бой всех чудовищ своего мира! Я разорву их плоть и сталь! Мутанты никогда больше не будут прятаться!',
        sound: 'metal',
        emotion: 'intense'
      }
    ]
  },

  // =========================================================================
  // 13. CHAPTER 7: Манхэттен. «УЛЬТИМАТУМ МУТАНТОВ» (Финальный бой с Халком и Стражами)
  // =========================================================================
  {
    id: 'chapter_7',
    title: 'МИССИЯ 7. «УЛЬТИМАТУМ МУТАНТОВ»',
    subtitle: 'Манхэттен. Финальная битва за уничтожение расизма.',
    background: '/assets/mindscape.jpg',
    lines: [
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Земля содрогается под шагами зелёного гиганта. Халк и тяжёлые боевые платформы «Омега-Страж» наступают единым фронтом!',
        sound: 'metal',
        emotion: 'urgent'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Пришло время показать абсолютную мощь! Сожми оба кулака и разорви их строй (⚡ Разрыв [T])! Сведи ладони для колоссальной имплозии (💥 Имплозия [Q])! Сотри их в прах!',
        sound: 'metal',
        emotion: 'intense'
      }
    ],
    practicePrompt: {
      icon: '👑',
      title: 'Ультиматум: Битва с Халком и Стражами',
      description: 'Используй Разрыв [T] и Имплозию [Q], сокруши Халка и тяжелые машины войны!',
      stepType: 'ultimatum'
    }
  },

  // =========================================================================
  // 14. EPILOGUE: «ТРИУМФ HOMO SUPERIOR» (Финал освобождения)
  // =========================================================================
  {
    id: 'epilogue',
    title: 'ФИНАЛ: «ТРИУМФ HOMO SUPERIOR»',
    subtitle: 'Манхэттен. Падение антимутантского режима.',
    background: '/assets/erik_adult.jpg',
    lines: [
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Тишина. Обломки Стражей дымятся на улицах. Законы о сегрегации мутантов сожжены. Мы сломали хребет машине угнетения.',
        sound: 'heartbeat',
        emotion: 'intense'
      },
      {
        speaker: 'charles',
        speakerName: 'Чарльз Ксавьер (телепатически)',
        text: 'Мир изменился навсегда, Эрик. Они больше никогда не посмеют притеснять нас. Мутанты свободны.',
        sound: 'psychic'
      },
      {
        speaker: 'erik',
        speakerName: 'Магнето',
        text: 'Свобода не даруется милостью врагов, Чарльз. Её выковывают в пламени битв. Пока я дышу — ни один ребёнок с геном X не узнает ужаса лагерей. Я — Магнето. И этот мир принадлежит нам!',
        sound: 'metal',
        emotion: 'intense'
      },
      {
        speaker: 'narrator',
        speakerName: 'Летопись Новой Эры',
        text: 'Расизм против мутантов был сокрушён на улицах Земли. Магнето доказал, что несокрушимая воля способна изменить ход истории. Homo Superior вступил в свои законные права.',
        sound: 'metal'
      }
    ]
  }
];

export class StoryNovelManager {
  private container: HTMLElement;
  private sfx: SFXManager;
  private isMouseMode = false;

  // State
  private currentChapterIndex = 0;
  private currentLineIndex = 0;
  private isTyping = false;
  private typeTimeout: number | null = null;
  private currentFullText = '';

  // Lock minigame state
  public isLockActive = false;
  private lockProgress = 0; // 0 to 100
  private lockRequiredPulls = 3;
  private lockCompletedPulls = 0;
  private lockHeldTime = 0;
  private lockWasGripped = false;
  private lockCooldown = 0;

  // Awakening minigame state (Chapter 5)
  public isAwakeningActive = false;
  private awakeningProgress = 0; // 0 to 100
  private awakeningHeldTime = 0;

  // Callbacks
  private onChapterPracticeCallback: ((stepType: 'throw' | 'lock' | 'shield' | 'battle' | 'escape' | 'heroes' | 'ultimatum') => void) | null = null;
  private onStoryCompleteCallback: (() => void) | null = null;

  constructor(sfx: SFXManager) {
    this.sfx = sfx;
    let el = document.getElementById('story-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'story-container';
      el.className = 'story-container hidden';
      document.body.appendChild(el);
    }
    this.container = el;
  }

  setMouseMode(enabled: boolean): void {
    this.isMouseMode = enabled;
  }

  onPractice(cb: (stepType: 'throw' | 'lock' | 'shield' | 'battle' | 'escape' | 'heroes' | 'ultimatum') => void): void {
    this.onChapterPracticeCallback = cb;
  }

  onComplete(cb: () => void): void {
    this.onStoryCompleteCallback = cb;
  }

  /** Step 1: Start Prologue Video Intro */
  startIntroVideo(onFinished: () => void): void {
    this.container.classList.remove('hidden');
    this.container.innerHTML = `
      <div class="intro-video-wrapper">
        <video id="intro-video" class="intro-video" autoplay playsinline preload="auto">
          <source src="/assets/intro.mp4" type="video/mp4" />
        </video>
        <div class="video-camera-tip">
          <span class="tip-glyph">👁️</span>
          <span>ОПТИЧЕСКИЙ ТРЕКИНГ: НАВЕДИ РУКУ И СОЖМИ В КУЛАК ✊</span>
        </div>
        <button id="btn-skip-video" class="btn-skip-intro">ПРОПУСТИТЬ (ESC / ✊ КУЛАК) ⏭</button>
      </div>
    `;

    const video = document.getElementById('intro-video') as HTMLVideoElement | null;
    const skipBtn = document.getElementById('btn-skip-video');

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      this.playTitleCards(onFinished);
    };

    if (video) {
      video.play().catch(() => {
        // Autoplay may need user gesture; fallback smoothly
        console.warn('Autoplay prevented, skipping video');
      });
      video.onended = () => finish();
      video.onerror = () => finish();
    }

    skipBtn?.addEventListener('click', () => finish());

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        window.removeEventListener('keydown', keyHandler);
        finish();
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  /** Step 2: Cinematic Title Cards and Exposition */
  playTitleCards(onFinished: () => void): void {
    this.sfx.playMetalGong();
    this.container.innerHTML = `
      <div class="intro-title-screen">
        <div class="intro-credits">
          <div class="credit-brand">MARVEL × RUNIX TEAM</div>
          <div class="credit-present">ПРЕДСТАВЛЯЮТ</div>
          <h1 class="credit-title">MAGNUS</h1>
          <div class="credit-disclaimer">Фан-проект хакатона ADMIT 2026. Не аффилирован с Marvel.</div>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.playExpositionScreen(onFinished);
    }, 4500);
  }

  /** Step 3: Arakko Exposition Narrative */
  private playExpositionScreen(onFinished: () => void): void {
    this.sfx.playPsychicVoice();
    this.container.innerHTML = `
      <div class="exposition-screen" style="background-image: url('/assets/arakko.jpg');">
        <div class="exposition-backdrop"></div>
        <div class="exposition-content">
          <div class="exposition-tag">ПРОЛОГ: АРАККО</div>
          <div class="exposition-text" id="expo-text">
            <p>На Аракко идёт беспощадная война. Вечные стремятся стереть мутантов.</p>
            <p>Их титан Уранос вырвал сердце сильнейшего из них — <strong>Магнето</strong>.</p>
            <p>Он отказался от резервных копий Церебро: если он умрёт сейчас, его не воскресят.</p>
            <p>Единственное, что удерживает его в живых — это магнетизм, качающий кровь, и его воспоминания...</p>
          </div>
          <div class="exposition-dialogue">
            <div class="speaker-tag charles-tag">Чарльз Ксавьер (в разуме):</div>
            <div class="dialogue-line">«Не засыпай, друг мой. Слышишь меня? Держись!»</div>
            <div class="speaker-tag erik-tag">Эрик:</div>
            <div class="dialogue-line">«Ты... всегда лез в мой разум без стука...»</div>
            <div class="speaker-tag charles-tag">Чарльз:</div>
            <div class="dialogue-line">«Тогда пойдём внутрь вместе. Нам нужно найти то, за что ты держишься!»</div>
          </div>
          <button id="btn-expo-proceed" class="tactical-cmd-btn primary expo-btn">
            <span class="cmd-title">[ ВОЙТИ В ПАМЯТЬ ▶ ]</span>
          </button>
        </div>
      </div>
    `;

    const btn = document.getElementById('btn-expo-proceed');
    btn?.addEventListener('click', () => {
      this.sfx.playClick();
      this.container.classList.add('hidden');
      onFinished();
    });
  }

  /** Launch a specific Chapter of the Visual Novel */
  playChapter(chapterIndex: number): void {
    this.currentChapterIndex = Math.min(chapterIndex, STORY_CHAPTERS.length - 1);
    this.currentLineIndex = 0;
    this.isLockActive = false;
    this.renderNovelUI();
  }

  /** Render the Visual Novel UI container */
  private renderNovelUI(): void {
    const chapter = STORY_CHAPTERS[this.currentChapterIndex];
    if (!chapter) return;

    this.container.classList.remove('hidden');
    this.container.innerHTML = `
      <div class="vn-stage" style="background-image: url('${chapter.background}');">
        <div class="vn-backdrop"></div>
        
        <!-- Top Classified Datum Bar -->
        <div class="vn-datum-bar-top">
          <div class="vn-dossier-tag">
            <span class="vn-pulse-dot"></span>
            <span class="vn-dossier-label">CLASSIFIED DOSSIER // FREQ 141.80 MHz</span>
          </div>
          <div class="vn-chapter-center">
            <span class="vn-chapter-id">${chapter.title}</span>
            <span class="vn-chapter-sub">${chapter.subtitle}</span>
          </div>
          <div class="vn-audio-waveform" title="Audio Waveform Telemetry">
            <span class="wave-bar wb-1"></span>
            <span class="wave-bar wb-2"></span>
            <span class="wave-bar wb-3"></span>
            <span class="wave-bar wb-4"></span>
            <span class="wave-bar wb-5"></span>
            <span class="wave-bar wb-6"></span>
            <span class="wave-bar wb-7"></span>
          </div>
          <button id="btn-vn-skip" class="vn-skip-btn">[ OVERRIDE // SKIP INTEL ▶ ]</button>
        </div>

        <!-- Portraits -->
        <div class="vn-portraits">
          <div id="portrait-left" class="vn-portrait vn-portrait-left">
            <div class="portrait-frame">
              <span class="portrait-callsign">SUBJ: LEHNSHERR</span>
              <img id="img-portrait-left" src="/assets/youngmagneto.png" alt="Young Erik" />
              <div class="portrait-corner tl">+</div>
              <div class="portrait-corner tr">+</div>
              <div class="portrait-corner bl">+</div>
              <div class="portrait-corner br">+</div>
            </div>
          </div>
          <div id="portrait-right" class="vn-portrait vn-portrait-right">
            <div class="portrait-frame">
              <span class="portrait-callsign">SUBJ: PROFESSOR_X</span>
              <img id="img-portrait-right" src="/assets/xavier.png" alt="Charles Xavier" />
              <div class="portrait-corner tl">+</div>
              <div class="portrait-corner tr">+</div>
              <div class="portrait-corner bl">+</div>
              <div class="portrait-corner br">+</div>
            </div>
          </div>
        </div>

        <!-- Dialogue Box -->
        <div id="vn-box" class="vn-dialogue-box">
          <div class="vn-speaker-bar">
            <div class="vn-speaker-badge">
              <span class="speaker-glyph">◈</span>
              <span id="vn-speaker" class="vn-speaker">Чарльз Ксавьер</span>
            </div>
            <span class="vn-instruction-hint">[ ПРОБЕЛ / НАВЕДИ И СОЖМИ КУЛАК ✊ ]</span>
          </div>
          <div id="vn-text" class="vn-text"></div>
          <div class="vn-actions">
            <button id="btn-vn-next" class="tactical-cmd-btn primary vn-next-btn" title="Наведи курсор рукой и сожми кулак ✊">
              <span class="cmd-title">ДАЛЕЕ ▶</span>
              <span class="cmd-hint-fist" style="font-size: 0.95rem; margin-left: 6px;">✊</span>
            </button>
          </div>
        </div>

        <!-- Interactive Lock Container (Used in Chapter 2) -->
        <div id="lock-container" class="lock-container hidden">
          <div class="lock-graphic">
            <div class="lock-shackle"></div>
            <div class="lock-body">
              <div class="lock-keyhole"></div>
            </div>
            <div id="lock-chains" class="lock-chains">⛓️ ⛓️ ⛓️</div>
            <div id="lock-sparks" class="lock-sparks"></div>
          </div>
          <div class="lock-hud">
            <div class="lock-hud-tag">KRUPP-STAHL // INDUSTRIAL BLAST LOCK</div>
            <div class="lock-title">РАЗРЫВ СТАЛЬНОГО ЗАМКА</div>
            <div class="lock-instruction">
              Сожми <strong>ОБЕ руки в кулаки</strong> перед сенсором и резко дёрни на себя!<br/>
              <em>(В режиме мыши: зажми ЛКМ+ПКМ / Пробел или кнопку ниже)</em>
            </div>
            <div class="hud-bar lock-bar">
              <div id="lock-fill" class="hud-bar-fill lock-fill" style="width: 0%;"></div>
            </div>
            <div id="lock-status" class="lock-status">ГОТОВЬСЯ К РЫВКУ (0 / 3)</div>
            <div class="lock-hands-indicator">
              <span id="lock-badge-l" class="hand-badge">✋ Левая: Ждём</span>
              <span id="lock-badge-r" class="hand-badge">✋ Правая: Ждём</span>
            </div>
            <button id="btn-force-lock-pull" class="tactical-cmd-btn primary lock-pull-btn">
              <span class="cmd-title">⚡ СОРВАТЬ ЗАМОК [ КЛИК / ПРОБЕЛ ]</span>
            </button>
          </div>
        </div>

        <!-- Interactive Awakening Container (Used in Chapter 5) -->
        <div id="awakening-container" class="lock-container hidden">
          <div class="lock-hud">
            <div class="lock-hud-tag">NEURAL SYNCHRONIZATION // TELEPATHIC LINK</div>
            <div class="lock-title" style="color: #f2f3f5;">ПРОБУЖДЕНИЕ РАЗУМА</div>
            <div class="lock-instruction">
              Раскрой <strong>ОБЕ ладони навстречу камере</strong> и удерживай 3 секунды!<br/>
              <em>(В режиме мыши: удерживай Пробел или обе кнопки мыши)</em>
            </div>
            <div class="hud-bar lock-bar">
              <div id="awakening-fill" class="hud-bar-fill lock-fill" style="width: 0%; background: #d97706;"></div>
            </div>
            <div id="awakening-status" class="lock-status">Удерживай ладони открытыми... (0 / 3.0с)</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-vn-next')?.addEventListener('click', () => this.advanceDialogue());
    document.getElementById('vn-box')?.addEventListener('click', () => this.advanceDialogue());
    document.getElementById('btn-vn-skip')?.addEventListener('click', () => this.finishChapter());

    this.displayCurrentLine();
  }

  /** Display currently active line with typewriter effect */
  private displayCurrentLine(): void {
    const chapter = STORY_CHAPTERS[this.currentChapterIndex];
    if (!chapter || this.currentLineIndex >= chapter.lines.length) {
      this.finishChapter();
      return;
    }

    const line = chapter.lines[this.currentLineIndex];
    const speakerEl = document.getElementById('vn-speaker');
    const textEl = document.getElementById('vn-text');
    const leftPortrait = document.getElementById('portrait-left');
    const rightPortrait = document.getElementById('portrait-right');
    const leftImg = document.getElementById('img-portrait-left') as HTMLImageElement | null;
    const rightImg = document.getElementById('img-portrait-right') as HTMLImageElement | null;

    if (!textEl || !speakerEl) return;

    speakerEl.textContent = line.speakerName;

    // Play speaker / action specific sound
    if (line.sound === 'psychic') {
      this.sfx.playPsychicVoice();
    } else if (line.sound === 'metal') {
      this.sfx.playMetalGong();
    } else if (line.sound === 'camp_alarm') {
      this.sfx.playCampAlarm();
    } else if (line.sound === 'heartbeat') {
      this.sfx.playHeartbeat();
    } else if (line.sound === 'puppet_snap') {
      this.sfx.playPuppetStringSnap();
    } else if (line.speaker === 'voice') {
      this.sfx.playPsychicWhisper();
    } else {
      this.sfx.playClick();
    }

    // Configure portraits
    if (leftPortrait && rightPortrait && leftImg && rightImg) {
      if (line.speaker === 'charles') {
        leftPortrait.classList.remove('active');
        leftPortrait.classList.add('dimmed');
        rightPortrait.classList.remove('dimmed');
        rightPortrait.classList.add('active');
        rightImg.src = '/assets/xavier.png';
      } else if (line.speaker === 'young_erik') {
        leftPortrait.classList.remove('dimmed');
        leftPortrait.classList.add('active');
        rightPortrait.classList.remove('active');
        rightPortrait.classList.add('dimmed');
        leftImg.src = '/assets/youngmagneto.png';
      } else if (line.speaker === 'erik') {
        leftPortrait.classList.remove('dimmed');
        leftPortrait.classList.add('active');
        rightPortrait.classList.remove('active');
        rightPortrait.classList.add('dimmed');
        leftImg.src = '/assets/erik_adult.jpg';
      } else {
        leftPortrait.classList.add('dimmed');
        rightPortrait.classList.add('dimmed');
      }
    }

    // Start typewriter
    this.currentFullText = line.text;
    this.isTyping = true;
    if (this.typeTimeout !== null) {
      window.clearTimeout(this.typeTimeout);
      this.typeTimeout = null;
    }

    textEl.textContent = '';
    let charIdx = 0;

    const typeChar = () => {
      if (!this.isTyping) return;
      if (charIdx < this.currentFullText.length) {
        textEl.textContent = this.currentFullText.slice(0, charIdx + 1);
        if (charIdx % 3 === 0) {
          this.sfx.playTypewriterBlip();
        }
        charIdx++;
        this.typeTimeout = window.setTimeout(typeChar, 20);
      } else {
        this.isTyping = false;
        this.typeTimeout = null;
      }
    };

    typeChar();
  }

  /** Advance dialogue on click or keypress */
  public advanceDialogue(): void {
    if (this.isLockActive || this.isAwakeningActive) return;

    if (this.isTyping) {
      // Instant complete current line
      this.isTyping = false;
      if (this.typeTimeout !== null) {
        window.clearTimeout(this.typeTimeout);
        this.typeTimeout = null;
      }
      const textEl = document.getElementById('vn-text');
      if (textEl) textEl.textContent = this.currentFullText;
      return;
    }

    this.currentLineIndex++;
    const chapter = STORY_CHAPTERS[this.currentChapterIndex];
    if (chapter && this.currentLineIndex < chapter.lines.length) {
      this.displayCurrentLine();
    } else {
      this.finishChapter();
    }
  }

  /** Finish chapter dialogue and move to practice/battle */
  private finishChapter(): void {
    const chapter = STORY_CHAPTERS[this.currentChapterIndex];
    if (!chapter) {
      this.container.classList.add('hidden');
      return;
    }

    // Special case for Chapter 2: Interactive Lock mini-game
    if (chapter.id === 'chapter_2') {
      this.startLockMinigame();
      return;
    }

    // Special case for Chapter 5: Interactive Awakening Gesture mini-game
    if (chapter.id === 'chapter_5') {
      this.startAwakeningMinigame();
      return;
    }

    // Hide visual novel and launch corresponding interactive gameplay if prompt exists
    if (chapter.practicePrompt && this.onChapterPracticeCallback) {
      this.container.classList.add('hidden');
      this.onChapterPracticeCallback(chapter.practicePrompt.stepType);
    } else if (this.currentChapterIndex < STORY_CHAPTERS.length - 1) {
      // Exposition interlude finished -> seamlessly proceed to the next story chapter!
      this.playChapter(this.currentChapterIndex + 1);
    } else {
      this.container.classList.add('hidden');
      if (this.onStoryCompleteCallback) {
        this.onStoryCompleteCallback();
      }
    }
  }

  /** Start interactive "Замок" (Lock) minigame */
  private startLockMinigame(): void {
    this.isLockActive = true;
    this.lockProgress = 0;
    this.lockCompletedPulls = 0;
    this.lockHeldTime = 0;
    this.lockWasGripped = false;
    this.lockCooldown = 0;

    const vnBox = document.getElementById('vn-box');
    const lockContainer = document.getElementById('lock-container');
    if (vnBox) vnBox.classList.add('hidden');
    if (lockContainer) lockContainer.classList.remove('hidden');

    // Ensure camera overlay is visible and on top so user can see hand tracking!
    const cam = document.getElementById('camera-overlay');
    if (cam) cam.classList.add('visible');

    // Attach click handler to force pull button
    const forceBtn = document.getElementById('btn-force-lock-pull');
    if (forceBtn) {
      forceBtn.onclick = (e) => {
        e.stopPropagation();
        if (this.isLockActive && this.lockCooldown <= 0) {
          this.triggerLockYank();
        }
      };
    }

    this.sfx.playLockCrack();
    this.updateLockUI();
  }

  /** Update Lock Minigame gesture tracking every frame */
  updateLockMinigame(hands: TrackedHands, gestures: GestureState, dt: number): void {
    if (!this.isLockActive) return;

    if (this.lockCooldown > 0) {
      this.lockCooldown -= dt;
    }

    const left = gestures.leftFeatures;
    const right = gestures.rightFeatures;

    const leftOK = Boolean(left && (left.closure < 1.45 || gestures.shield.active));
    const rightOK = Boolean(right && (right.closure < 1.45 || gestures.grab.phase === 'GRAB'));

    // Update real-time hand status badges
    const badgeL = document.getElementById('lock-badge-l');
    const badgeR = document.getElementById('lock-badge-r');
    if (badgeL) {
      badgeL.textContent = leftOK ? '✊ Левая: Кулак (OK)' : (left ? '✋ Левая: Сожми кулак' : '❌ Левая: Не видна');
      badgeL.className = leftOK ? 'hand-badge ready' : 'hand-badge';
    }
    if (badgeR) {
      badgeR.textContent = rightOK ? '✊ Правая: Кулак (OK)' : (right ? '✋ Правая: Сожми кулак' : '❌ Правая: Не видна');
      badgeR.className = rightOK ? 'hand-badge ready' : 'hand-badge';
    }

    let isGripping = false;
    let isYanking = false;

    if (this.isMouseMode) {
      const spaceHeld = (window as any).__magneto_space_down || gestures.shield.active || gestures.grab.phase === 'GRAB';
      if (spaceHeld) {
        isGripping = true;
        this.lockHeldTime += dt;
        if (this.lockHeldTime > 0.25 && this.lockCooldown <= 0) {
          isYanking = true;
        }
      } else {
        isGripping = false;
        this.lockHeldTime = 0;
      }
    } else {
      // Camera Gesture Mode
      if (left && right) {
        const dx = left.wristScreen.x - right.wristScreen.x;
        const dy = left.wristScreen.y - right.wristScreen.y;
        const handsDistance = Math.sqrt(dx * dx + dy * dy);
        // Generous distance check (< 0.95 screen width, comfortable natural chest position)
        const handsClose = handsDistance < 0.95;
        isGripping = (leftOK || rightOK) && handsClose;

        if (isGripping) {
          this.lockHeldTime += dt;
          const vL = left.wristSpeed;
          const vR = right.wristSpeed;
          const maxSpeed = Math.max(vL, vR);

          // Fast pull towards camera/downwards with forgiving speed threshold
          if (maxSpeed > 0.35 && this.lockHeldTime > 0.15 && this.lockCooldown <= 0) {
            isYanking = true;
          }
        } else {
          this.lockHeldTime = 0;
        }
      } else if (leftOK || rightOK) {
        // Single hand detected as fist
        const activeHand = leftOK ? left! : right!;
        isGripping = true;
        this.lockHeldTime += dt;
        if (activeHand.wristSpeed > 0.4 && this.lockHeldTime > 0.2 && this.lockCooldown <= 0) {
          isYanking = true;
        }
      } else {
        isGripping = false;
        this.lockHeldTime = 0;
      }
    }

    // Trigger yank!
    if (isYanking) {
      this.triggerLockYank();
    }

    this.lockWasGripped = isGripping;
  }

  /** Trigger a successful yank pulse on the lock */
  public triggerLockYank(): void {
    if (this.lockCooldown > 0 && this.lockCompletedPulls < this.lockRequiredPulls) return;
    this.lockCompletedPulls++;
    this.lockCooldown = 0.5;
    this.lockHeldTime = 0;
    this.lockProgress = Math.min(100, (this.lockCompletedPulls / this.lockRequiredPulls) * 100);

    const stageEl = document.querySelector('.vn-stage') as HTMLElement | null;
    stageEl?.classList.add('screen-shake');
    setTimeout(() => stageEl?.classList.remove('screen-shake'), 400);

    if (this.lockProgress >= 100) {
      // Lock broken!
      this.sfx.playLockBreak();
      this.updateLockUI();
      setTimeout(() => {
        this.isLockActive = false;
        this.container.classList.add('hidden');
        if (this.onChapterPracticeCallback) {
          this.onChapterPracticeCallback('lock');
        }
      }, 1200);
    } else {
      this.sfx.playLockCrack();
      this.updateLockUI();
    }
  }

  /** Update lock visual feedback */
  private updateLockUI(): void {
    const fillEl = document.getElementById('lock-fill');
    const statusEl = document.getElementById('lock-status');
    const chainsEl = document.getElementById('lock-chains');
    if (fillEl) fillEl.style.width = `${this.lockProgress}%`;
    if (statusEl) {
      if (this.lockProgress >= 100) {
        statusEl.textContent = '💥 ЗАМОК ВЗОРВАН! СИЛА ПРОБУДИЛАСЬ!';
        statusEl.className = 'lock-status broken';
      } else {
        statusEl.textContent = `РЫВОК СИЛЫ: ${this.lockCompletedPulls} / ${this.lockRequiredPulls} (Держи кулаки и тяни!)`;
      }
    }
    if (chainsEl) {
      chainsEl.style.transform = `scale(${1 + this.lockCompletedPulls * 0.15}) rotate(${this.lockCompletedPulls * 5}deg)`;
    }
  }

  /** Start Chapter 5 Awakening Minigame */
  private startAwakeningMinigame(): void {
    this.isAwakeningActive = true;
    this.awakeningProgress = 0;
    this.awakeningHeldTime = 0;

    const vnBox = document.getElementById('vn-box');
    const awkContainer = document.getElementById('awakening-container');
    if (vnBox) vnBox.classList.add('hidden');
    if (awkContainer) awkContainer.classList.remove('hidden');

    this.sfx.playPsychicVoice();
    this.updateAwakeningUI();
  }

  /** Update Awakening Minigame frame tracking */
  updateAwakeningMinigame(hands: TrackedHands, gestures: GestureState, dt: number): void {
    if (!this.isAwakeningActive) return;

    let isHoldingOpen = false;

    if (this.isMouseMode) {
      isHoldingOpen = (window as any).__magneto_space_down || gestures.shield.active;
    } else {
      const left = gestures.leftFeatures;
      const right = gestures.rightFeatures;
      if (left && right && left.closure > 1.35 && right.closure > 1.35) {
        isHoldingOpen = true;
      }
    }

    if (isHoldingOpen) {
      this.awakeningHeldTime += dt;
      this.awakeningProgress = Math.min(100, (this.awakeningHeldTime / 3.0) * 100);
      if (Math.random() < 0.08) {
        this.sfx.playPsychicVoice();
      }
    } else {
      this.awakeningHeldTime = Math.max(0, this.awakeningHeldTime - dt * 1.5);
      this.awakeningProgress = (this.awakeningHeldTime / 3.0) * 100;
    }

    this.updateAwakeningUI();

    if (this.awakeningProgress >= 100) {
      this.isAwakeningActive = false;
      this.sfx.playWaveComplete();
      const stageEl = document.querySelector('.vn-stage') as HTMLElement | null;
      stageEl?.classList.add('screen-shake');

      setTimeout(() => {
        const awkContainer = document.getElementById('awakening-container');
        if (awkContainer) awkContainer.classList.add('hidden');
        // Proceed immediately to Chapter 9: Interlude 5: «КРАХ МИРНОГО ДИАЛОГА»
        this.playChapter(9);
      }, 1400);
    }
  }

  /** Update awakening UI */
  private updateAwakeningUI(): void {
    const fillEl = document.getElementById('awakening-fill');
    const statusEl = document.getElementById('awakening-status');
    if (fillEl) fillEl.style.width = `${this.awakeningProgress}%`;
    if (statusEl) {
      if (this.awakeningProgress >= 100) {
        statusEl.textContent = '🌟 РАЗУМ ОСВОБОЖДЁН! МАГНЕТО ПРОСНУЛСЯ НА АРАККО!';
        statusEl.className = 'lock-status broken';
      } else {
        const seconds = Math.min(3.0, this.awakeningHeldTime).toFixed(1);
        statusEl.textContent = `ПРОБУЖДЕНИЕ: ${seconds} / 3.0с (Держи ладони открытыми!)`;
      }
    }
  }
}
