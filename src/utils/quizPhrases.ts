/**
 * The line shown after each answer. It changes with how the play is going: how many wrong answers in a row (and in the
 * whole play) and how many right ones in a row, so the sign never says the same thing twice in a row.
 */
export interface PhraseInput {
  correct: boolean;
  timedOut: boolean;
  /** Right answers in a row BEFORE this answer, wrong ones in a row before it, and wrong ones in the whole play before it. */
  rightRun: number;
  wrongRun: number;
  wrongTotal: number;
  isAr: boolean;
  random?: () => number;
}

const pick = (list: string[], random: () => number) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

export function feedbackPhrase({ correct, timedOut, rightRun, wrongRun, wrongTotal, isAr, random = Math.random }: PhraseInput): string {
  if (correct) {
    const run = rightRun + 1;
    if (wrongRun >= 2) return pick(isAr ? ['💪 أخيرًا! الحال اتعدل', '💪 شوفت؟ لما تركّز بتعرف!', '💪 رجعت للمستوى، برافو!'] : ['💪 Finally! Back on track', '💪 See? You can do it when you focus!', '💪 Back in form, bravo!'], random);
    if (run >= 7) return (isAr ? `👑 أسطورة! ${run} صح ورا بعض ومحدش قدك` : `👑 Legend! ${run} right in a row, nobody can touch you`);
    if (run >= 5) return pick(isAr ? [`🔥🔥 إنت وحش! ${run} صح ورا بعض`, `🔥🔥 ولّعتها! ${run} ورا بعض`] : [`🔥🔥 You are a beast! ${run} right in a row`, `🔥🔥 On fire! ${run} in a row`], random);
    if (run >= 3) return pick(isAr ? ['🔥 يا سلام يا بطل!', '🔥 إنت ولّعت!', '🔥 كمّل كده يا معلم!'] : ['🔥 Wow, champion!', '🔥 You are on fire!', '🔥 Keep going, boss!'], random);
    if (run === 2) return pick(isAr ? ['✅ حلو أوي، كمّل!', '✅ ماشاء الله عليك!', '✅ ثنائية! كمّل'] : ['✅ Nice one, keep going!', '✅ Well done!', '✅ Two in a row! Keep it up'], random);
    return pick(isAr ? ['✅ صح!', '✅ برافو عليك!', '✅ تمام كده!', '✅ إجابة موفقة!'] : ['✅ Right!', '✅ Bravo!', '✅ Nicely done!', '✅ Spot on!'], random);
  }

  const run = wrongRun + 1;
  const total = wrongTotal + 1;
  if (timedOut) {
    if (run >= 3) return isAr ? `⏰ الوقت خلص تاني! ${run} مرات ورا بعض، إنت نايم؟` : `⏰ Time ran out again! ${run} times in a row, are you asleep?`;
    return pick(isAr ? ['⏰ الوقت خلص!', '⏰ نمت ولا إيه؟', '⏰ الوقت جري منك!'] : ['⏰ Time is up!', '⏰ Fell asleep?', '⏰ The clock ran away from you!'], random);
  }
  if (rightRun >= 3) return pick(isAr ? ['❌ آه! كنت ماشي زي الفل وضيّعت السلسلة 🥲', '❌ يا خسارة! السلسلة اتكسرت'] : ['❌ Oh no! You were doing great and lost the streak 🥲', '❌ Such a pity! The streak is broken'], random);
  if (run >= 5) return isAr ? `😂 مفيش فايدة فيك! ${run} غلط ورا بعض` : `😂 There is no hope for you! ${run} wrong in a row`;
  if (run === 4) return pick(isAr ? ['❌ مفيش فايدة فيك 😅', '❌ ده إيه ده؟ 4 غلط ورا بعض!'] : ['❌ You are hopeless 😅', '❌ What is this? 4 wrong in a row!'], random);
  if (run === 3) return pick(isAr ? ['❌ مش قولتلك غلط قبل كده؟', '❌ غلط تالت مرة! ركّز بقى'] : ['❌ Did I not tell you it is wrong before?', '❌ Wrong a third time! Focus now'], random);
  if (run === 2) return pick(isAr ? ['❌ غلط يا باشتنا!', '❌ غلط تاني؟ ركّز شوية', '❌ لأ كده كتير!'] : ['❌ Wrong, my friend!', '❌ Wrong again? Focus a little', '❌ That is too many!'], random);
  if (total >= 6) return isAr ? '❌ غلطاتك كتير النهارده يا نجم' : '❌ You are making a lot of mistakes today, star';
  return pick(isAr ? ['❌ غلط يا حبيبي!', '❌ معلش، حاول تاني', '❌ لأ، قرّبت!', '❌ مش دي!'] : ['❌ Wrong, my dear!', '❌ Never mind, try again', '❌ No, you were close!', '❌ Not that one!'], random);
}
