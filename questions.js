(function () {
  'use strict';

  let idCounter = 0;

  const DRILLS = Object.freeze({
    mental: { name: '80 in 8 Mental Math', count: 80, durationSeconds: 480, correct: 1, incorrect: -1 },
    sequences: { name: 'Timed Sequences', count: 20, durationSeconds: 600, correct: 1, incorrect: -1 },
    probability: { name: 'Timed Probability & EV', count: 15, durationSeconds: 900, correct: 1, incorrect: -1 }
  });

  const MENTAL_SUBTYPES = Object.freeze({
    addsub: 'Addition and subtraction',
    multiplication: 'Multiplication',
    division: 'Division',
    fractions: 'Fractions and decimals',
    percentages: 'Percentages',
    missing: 'Missing-number equations'
  });

  const SEQUENCE_SUBTYPES = Object.freeze({
    differences: 'First and second differences',
    ratios: 'Ratios and geometric patterns',
    alternating: 'Alternating or interleaved patterns',
    recurrences: 'Recurrences and multiply-adjust rules',
    families: 'Familiar number families',
    digits: 'Clear digit transformations'
  });

  const PROBABILITY_SUBTYPES = Object.freeze({
    coins: 'Coins and binomial probability',
    dice: 'Dice and enumeration',
    cards: 'Cards and combinations',
    sampling: 'Sampling and coloured balls',
    conditional: 'Conditional probability and Bayes',
    ev: 'Expected value and fair price'
  });

  function uid(prefix) {
    idCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choice(items) {
    return items[randomInt(0, items.length - 1)];
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function sampleDistinct(items, count) {
    if (!Array.isArray(items) || count < 0 || count > items.length) throw new Error('Invalid distinct sample');
    return shuffle(items).slice(0, count);
  }

  function questionUniquenessKey(question) {
    const raw = question && question.dedupeKey ? question.dedupeKey : question.prompt;
    return String(raw || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function weightedChoice(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll < 0) return entry.value;
    }
    return entries[entries.length - 1].value;
  }

  function gcd(a, b) {
    let x = Math.abs(Math.trunc(a));
    let y = Math.abs(Math.trunc(b));
    while (y) [x, y] = [y, x % y];
    return x || 1;
  }

  function lcm(a, b) {
    return Math.abs(a * b) / gcd(a, b);
  }

  function rational(num, den) {
    if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || den === 0) throw new Error('Invalid rational');
    const sign = den < 0 ? -1 : 1;
    const divisor = gcd(num, den);
    return { num: sign * (num / divisor), den: Math.abs(den / divisor) };
  }

  function addR(a, b) {
    return rational(a.num * b.den + b.num * a.den, a.den * b.den);
  }

  function subR(a, b) {
    return rational(a.num * b.den - b.num * a.den, a.den * b.den);
  }

  function mulR(a, b) {
    return rational(a.num * b.num, a.den * b.den);
  }

  function divR(a, b) {
    if (b.num === 0) throw new Error('Division by zero');
    return rational(a.num * b.den, a.den * b.num);
  }

  function equalR(a, b) {
    return a.num === b.num && a.den === b.den;
  }

  function toNumber(value) {
    return value.num / value.den;
  }

  function decimalPlacesForDenominator(den) {
    let value = den;
    let twos = 0;
    let fives = 0;
    while (value % 2 === 0) { value /= 2; twos += 1; }
    while (value % 5 === 0) { value /= 5; fives += 1; }
    return value === 1 ? Math.max(twos, fives) : null;
  }

  function trimDecimal(value, maxDp) {
    const rounded = Number(value).toFixed(maxDp);
    return rounded.replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '').replace(/\.$/, '');
  }

  function formatRational(value, style) {
    const mode = style || 'auto';
    if (mode === 'fraction') {
      return value.den === 1 ? String(value.num) : `${value.num}/${value.den}`;
    }
    if (mode === 'percent') {
      const percent = value.num * 100 / value.den;
      return `${trimDecimal(percent, Number.isInteger(percent) ? 0 : 2)}%`;
    }
    if (mode === 'decimal') {
      const dp = decimalPlacesForDenominator(value.den);
      return trimDecimal(toNumber(value), dp == null ? 3 : Math.min(4, dp));
    }
    if (mode === 'currency') {
      const number = toNumber(value);
      const magnitude = Number.isInteger(Math.abs(number)) ? Math.abs(number) : trimDecimal(Math.abs(number), 2);
      return number < 0 ? `−£${magnitude}` : `£${magnitude}`;
    }
    if (value.den === 1) return String(value.num);
    const dp = decimalPlacesForDenominator(value.den);
    if (dp != null && dp <= 2) return trimDecimal(toNumber(value), dp);
    return `${value.num}/${value.den}`;
  }

  function probabilityDisplay(value) {
    const number = toNumber(value);
    const decimals = Math.abs(number) < 0.001 ? 6 : Math.abs(number) < 0.01 ? 4 : 3;
    const decimal = trimDecimal(number, decimals);
    return value.den === 1 ? String(value.num) : `${value.num}/${value.den} (${decimal})`;
  }

  function probabilityDistractors(correct, supplied) {
    const values = [];
    const displays = new Set();
    const add = (candidate) => {
      try {
        const value = rational(candidate.num, candidate.den);
        const numeric = toNumber(value);
        const display = probabilityDisplay(value);
        if (numeric <= 0 || numeric >= 1 || equalR(value, correct) || displays.has(display)) return;
        values.push(value);
        displays.add(display);
      } catch (_) { /* reject */ }
    };
    (supplied || []).forEach(add);
    add(subR(rational(1, 1), correct));
    add(mulR(correct, rational(2, 1)));
    add(divR(correct, rational(2, 1)));
    add(rational(correct.num + 1, correct.den));
    add(rational(correct.num - 1, correct.den));
    add(rational(correct.num, correct.den + 1));
    add(rational(correct.num + correct.den, correct.den * 2));
    let step = 1;
    while (values.length < 3 && step < 100) {
      add(addR(correct, rational(step, correct.den * 2)));
      add(subR(correct, rational(step, correct.den * 2)));
      step += 1;
    }
    if (values.length < 3) {
      [rational(1, 4), rational(1, 3), rational(1, 2), rational(2, 3), rational(3, 4)].forEach(add);
    }
    if (values.length < 3) throw new Error('Insufficient probability distractors');
    return values.slice(0, 3);
  }

  function numericDistractors(correct, style, supplied) {
    const values = [];
    const add = (candidate) => {
      try {
        const r = rational(candidate.num, candidate.den);
        if (!equalR(r, correct) && !values.some((item) => equalR(item, r))) values.push(r);
      } catch (_) { /* reject */ }
    };

    if (correct.den === 1) {
      const n = correct.num;
      // In fast MC arithmetic, a unique units digit can reveal the answer without doing
      // the calculation. Most integer questions therefore include at least two plausible
      // carry/tens-place errors with the same units digit as the correct result. A minority
      // deliberately retain the ordinary last-digit check so that the shortcut is useful,
      // but not sufficient on nearly every question.
      const protectAgainstLastDigitShortcut = Math.abs(n) >= 20 && Math.random() < 0.82;
      if (protectAgainstLastDigitShortcut) {
        const sameUnitsOffsets = shuffle([10, -10, 20, -20, 30, -30, 100, -100]);
        sameUnitsOffsets.slice(0, 2).forEach((offset) => add(rational(n + offset, 1)));
      }
      (supplied || []).forEach(add);
      [n + 1, n - 1, n + 10, n - 10, -n, Math.round(n * 0.9), Math.round(n * 1.1), n + choice([2, 5, 20])]
        .map((x) => rational(x, 1)).forEach(add);
    } else {
      (supplied || []).forEach(add);
      add(rational(correct.num + 1, correct.den));
      add(rational(correct.num - 1, correct.den));
      add(rational(correct.num, correct.den + 1));
      if (correct.num !== 0) add(rational(correct.den, correct.num));
      add(rational(correct.num * 10, correct.den));
      add(rational(correct.num, correct.den * 10));
    }
    let step = 1;
    while (values.length < 3) {
      add(addR(correct, rational(step, correct.den)));
      add(subR(correct, rational(step, correct.den)));
      step += 1;
    }
    return values.slice(0, 3).map((value) => formatRational(value, style));
  }

  function makeOptions(correctDisplay, distractors) {
    const unique = [];
    [correctDisplay].concat(distractors).forEach((item) => {
      const text = String(item);
      if (!unique.includes(text)) unique.push(text);
    });
    if (unique.length < 4) throw new Error('Insufficient unique options');
    const options = shuffle(unique.slice(0, 4));
    return { options, correctIndex: options.indexOf(String(correctDisplay)) };
  }

  function makeNumericQuestion(config) {
    const correct = rational(config.correct.num, config.correct.den);
    const correctAnswer = config.correctDisplay || formatRational(correct, config.style);
    const distractorDisplays = (config.distractorDisplays || []).slice();
    numericDistractors(correct, config.style, config.distractors).forEach((value) => {
      if (!distractorDisplays.includes(value) && value !== correctAnswer) distractorDisplays.push(value);
    });
    const mc = makeOptions(correctAnswer, distractorDisplays);
    return {
      id: uid(config.idPrefix || config.category),
      category: config.category,
      subtype: config.subtype,
      subtypeLabel: config.subtypeLabel,
      prompt: config.prompt,
      options: mc.options,
      correctIndex: mc.correctIndex,
      correctAnswer,
      correctValue: correct,
      answerStyle: config.style || 'auto',
      allowPercent: Boolean(config.allowPercent),
      approximateTolerance: Number.isFinite(config.approximateTolerance) ? Math.abs(config.approximateTolerance) : 0,
      explanation: config.explanation,
      fasterMethod: config.fasterMethod || '',
      method: config.method || '',
      assumptions: config.assumptions || '',
      templateId: config.templateId,
      dedupeKey: config.dedupeKey || ''
    };
  }

  function additionSubtractionQuestion() {
    const template = randomInt(1, 12);
    let prompt;
    let correct;
    let explanation;
    let fasterMethod = '';
    let distractors = [];
    let templateId;
    let style = 'auto';

    if (template === 1) {
      const a = randomInt(37, 99);
      const b = randomInt(28, 99);
      correct = rational(a + b, 1);
      prompt = `${a} + ${b}`;
      explanation = `${a} + ${b} = ${a + b}.`;
      distractors = [rational(a + b + 10, 1), rational(a + b - 10, 1), rational(Math.abs(a - b), 1)];
      templateId = 'add-2d-2d';
    } else if (template === 2) {
      const a = randomInt(275, 949);
      const b = randomInt(47, 198);
      correct = rational(a + b, 1);
      prompt = `${a} + ${b}`;
      explanation = `${a} + ${b} = ${a + b}.`;
      distractors = [rational(a + b + 10, 1), rational(a + b - 10, 1), rational(a + b + 100, 1)];
      templateId = 'add-3d-2d';
    } else if (template === 3) {
      const a = randomInt(375, 949);
      const b = randomInt(275, 899);
      correct = rational(a + b, 1);
      prompt = `${a} + ${b}`;
      explanation = `${a} + ${b} = ${a + b}.`;
      distractors = [rational(a + b + 100, 1), rational(a + b - 100, 1), rational(a + b + 10, 1)];
      templateId = 'add-3d-3d';
    } else if (template === 4) {
      const base = choice([199, 299, 499, 698, 799, 899, 999]);
      const b = randomInt(137, 568);
      correct = rational(base + b, 1);
      prompt = `${base} + ${b}`;
      explanation = `${base} + ${b} = ${base + b}.`;
      fasterMethod = `Round ${base} to ${base + 1}: ${base + 1} + ${b} = ${base + b + 1}, then subtract 1.`;
      distractors = [rational(base + b + 1, 1), rational(base + b - 1, 1), rational(base + b + 10, 1)];
      templateId = 'add-near-round';
    } else if (template === 5) {
      // e.g. 0.63 + 0.25
      const aHundredths = randomInt(18, 89);
      const bHundredths = randomInt(11, 79);
      correct = rational(aHundredths + bHundredths, 100);
      const a = formatRational(rational(aHundredths, 100), 'decimal');
      const b = formatRational(rational(bHundredths, 100), 'decimal');
      prompt = `${a} + ${b}`;
      explanation = `Align hundredths: ${a} + ${b} = ${formatRational(correct, 'decimal')}.`;
      fasterMethod = 'Treat both decimals as whole numbers of hundredths, add, then place the decimal point back.';
      distractors = [rational(aHundredths + bHundredths + 10, 100), rational(aHundredths + bHundredths - 10, 100), rational(aHundredths + bHundredths, 1000)];
      templateId = 'add-decimal-hundredths';
      style = 'decimal';
    } else if (template === 6) {
      // e.g. 0.34 - 0.067
      const aThousandths = randomInt(220, 950);
      const bThousandths = randomInt(21, Math.min(299, aThousandths - 20));
      const roundedAHundredths = Math.round(aThousandths / 10) * 10;
      const safeA = roundedAHundredths <= bThousandths ? roundedAHundredths + 100 : roundedAHundredths;
      correct = rational(safeA - bThousandths, 1000);
      const a = formatRational(rational(safeA, 1000), 'decimal');
      const b = formatRational(rational(bThousandths, 1000), 'decimal');
      prompt = `${a} − ${b}`;
      explanation = `Write ${a} as ${a.padEnd(Math.max(a.length, b.length), '0')} and subtract ${b}: the result is ${formatRational(correct, 'decimal')}.`;
      fasterMethod = 'Convert both values to thousandths, subtract the integers, then restore the decimal point.';
      distractors = [rational(safeA - bThousandths + 10, 1000), rational(safeA - bThousandths - 10, 1000), rational(safeA - bThousandths, 100)];
      templateId = 'sub-decimal-mixed-places';
      style = 'decimal';
    } else if (template === 7) {
      const aThousandths = randomInt(1250, 9850);
      const bThousandths = randomInt(115, 1985);
      correct = rational(aThousandths + bThousandths, 1000);
      const a = formatRational(rational(aThousandths, 1000), 'decimal');
      const b = formatRational(rational(bThousandths, 1000), 'decimal');
      prompt = `${a} + ${b}`;
      explanation = `Align decimal places: ${a} + ${b} = ${formatRational(correct, 'decimal')}.`;
      fasterMethod = 'Work in thousandths and restore the decimal point after adding.';
      distractors = [rational(aThousandths + bThousandths + 100, 1000), rational(aThousandths + bThousandths - 100, 1000), rational(aThousandths + bThousandths, 100)];
      templateId = 'add-decimal-mixed-places';
      style = 'decimal';
    } else if (template === 8) {
      const terms = Array.from({ length: randomInt(5, 7) }, () => randomInt(8, 59));
      const sum = terms.reduce((a, b) => a + b, 0);
      correct = rational(sum, 1);
      prompt = terms.join(' + ');
      explanation = `${terms.join(' + ')} = ${sum}.`;
      fasterMethod = 'Pair terms that make round totals before adding the remainder.';
      distractors = [rational(sum + 10, 1), rational(sum - 10, 1), rational(sum + 20, 1)];
      templateId = 'add-many-small';
    } else if (template === 9) {
      const a = randomInt(72, 129);
      const b = randomInt(28, a - 7);
      correct = rational(a - b, 1);
      prompt = `${a} − ${b}`;
      explanation = `${a} − ${b} = ${a - b}.`;
      distractors = [rational(a - b + 10, 1), rational(a - b - 10, 1), rational(b - a, 1)];
      templateId = 'sub-2d';
    } else if (template === 10) {
      const a = randomInt(520, 1199);
      const b = randomInt(178, 899);
      correct = rational(a - b, 1);
      prompt = `${a} − ${b}`;
      explanation = `${a} − ${b} = ${a - b}.`;
      distractors = [rational(a - b + 100, 1), rational(a - b - 100, 1), rational(a - b + 10, 1)];
      templateId = 'sub-3d';
    } else if (template === 11) {
      const a = choice([500, 700, 900, 1000, 1200]);
      const b = randomInt(237, a - 73);
      correct = rational(a - b, 1);
      prompt = `${a} − ${b}`;
      explanation = `${a} − ${b} = ${a - b}.`;
      fasterMethod = `Count up from ${b} to ${a} using a round intermediate value.`;
      distractors = [rational(a - b + 100, 1), rational(a - b - 100, 1), rational(a - b + 10, 1)];
      templateId = 'sub-3d-complement';
    } else {
      const bThousandths = randomInt(127, 893);
      correct = rational(1000 - bThousandths, 1000);
      const b = formatRational(rational(bThousandths, 1000), 'decimal');
      prompt = `1 − ${b}`;
      explanation = `1.000 − ${b} = ${formatRational(correct, 'decimal')}.`;
      fasterMethod = 'Think of the decimal as thousandths and take the complement to 1000.';
      distractors = [rational(1000 - bThousandths + 10, 1000), rational(1000 - bThousandths - 10, 1000), rational(bThousandths, 1000)];
      templateId = 'sub-decimal-complement';
      style = 'decimal';
    }

    return makeNumericQuestion({ category: 'mental', subtype: 'addsub', subtypeLabel: MENTAL_SUBTYPES.addsub, prompt, correct, style, distractors, explanation, fasterMethod, templateId });
  }

  function multiplicationQuestion() {
    const template = randomInt(1, 7);
    let a;
    let b;
    let fasterMethod = '';
    let templateId;

    if (template === 1) {
      a = randomInt(37, 96); b = randomInt(6, 9); templateId = 'multiply-2d-1d';
    } else if (template === 2) {
      a = randomInt(28, 89); b = randomInt(17, 47); templateId = 'multiply-2d-2d';
    } else if (template === 3) {
      a = choice([49, 51, 98, 99, 101]); b = randomInt(18, 59); templateId = 'multiply-near-round';
      const round = a < 50 ? 50 : (a < 90 ? 50 : 100);
      fasterMethod = `${a} × ${b} = ${round} × ${b} ${a < round ? '−' : '+'} ${Math.abs(a - round)} × ${b}.`;
    } else if (template === 4) {
      const centre = randomInt(28, 75);
      const d = randomInt(2, Math.min(12, centre - 2));
      a = centre - d; b = centre + d; templateId = 'multiply-difference-squares';
      fasterMethod = `Use difference of squares: (${centre} − ${d})(${centre} + ${d}) = ${centre}² − ${d}².`;
    } else if (template === 5) {
      a = randomInt(24, 96); b = choice([5, 25, 50, 100]); templateId = 'multiply-special';
      if (b === 25) fasterMethod = `Multiply by 100, then divide by 4: ${a}00 ÷ 4.`;
      if (b === 50) fasterMethod = `Multiply by 100, then halve.`;
      if (b === 5) fasterMethod = `Multiply by 10, then halve.`;
    } else if (template === 6) {
      a = choice([18, 24, 28, 32, 36, 42, 48, 56]); b = choice([15, 25, 35, 45]); templateId = 'multiply-halve-double';
      fasterMethod = `Halve one factor and double the other until the product is easier.`;
    } else {
      a = randomInt(31, 79); b = randomInt(23, 69); templateId = 'multiply-balanced';
    }

    const product = a * b;
    return makeNumericQuestion({
      category: 'mental', subtype: 'multiplication', subtypeLabel: MENTAL_SUBTYPES.multiplication,
      prompt: `${a} × ${b}`, correct: rational(product, 1), style: 'auto',
      // These correspond to multiplying one factor one unit too high/low. The
      // general distractor builder usually adds same-units-digit carry errors first,
      // while leaving a minority of questions where a last-digit check is useful.
      distractors: [rational(product + a, 1), rational(product - a, 1), rational(product + b, 1), rational(product - b, 1)],
      explanation: `${a} × ${b} = ${product}.`, fasterMethod, templateId,
      dedupeKey: `mental:multiplication:${Math.min(a, b)}x${Math.max(a, b)}`
    });
  }

  function divisionQuestion() {
    const decimalDivisorMode = Math.random() < 0.28;
    if (decimalDivisorMode) {
      const divisor = choice([rational(1, 20), rational(1, 10), rational(1, 5), rational(1, 4), rational(2, 5), rational(1, 2)]);
      const answer = rational(choice([120, 160, 240, 320, 480, 600, 720, 840, 960, 1200]), 1);
      const dividend = mulR(divisor, answer);
      const divisorText = formatRational(divisor, 'decimal');
      const dividendText = formatRational(dividend, 'decimal');
      return makeNumericQuestion({
        category: 'mental', subtype: 'division', subtypeLabel: MENTAL_SUBTYPES.division,
        prompt: `${dividendText} ÷ ${divisorText}`, correct: answer, style: 'auto',
        distractors: [rational(answer.num + 10, 1), rational(answer.num - 10, 1), rational(answer.num * 10, 1)],
        explanation: `${dividendText} ÷ ${divisorText} = ${answer.num}. Scale both numbers by ${divisor.den} to remove the decimal divisor.`,
        fasterMethod: `Scale both numbers so the divisor becomes an integer, then divide.`, templateId: 'division-decimal-divisor'
      });
    }

    const divisor = choice([4, 5, 8, 12, 16, 18, 20, 24, 25, 32, 40]);
    const decimalAnswerMode = Math.random() < 0.12;
    let answer;
    let dividend;
    let style = 'auto';
    if (decimalAnswerMode) {
      const tenths = choice([15, 25, 35, 45, 55, 65, 75, 85, 95, 125]);
      answer = rational(tenths, 10);
      dividend = divisor * tenths / 10;
      if (!Number.isInteger(dividend)) return divisionQuestion();
      style = 'decimal';
    } else {
      answer = rational(randomInt(18, 180), 1);
      dividend = divisor * answer.num;
    }
    const explanation = `${dividend} ÷ ${divisor} = ${formatRational(answer, style)} because ${divisor} × ${formatRational(answer, style)} = ${dividend}.`;
    return makeNumericQuestion({
      category: 'mental', subtype: 'division', subtypeLabel: MENTAL_SUBTYPES.division,
      prompt: `${dividend} ÷ ${divisor}`, correct: answer, style,
      distractors: [addR(answer, rational(10, 1)), subR(answer, rational(10, 1)), mulR(answer, rational(10, 1))],
      explanation, fasterMethod: `Factor or scale the divisor where useful; verify by multiplication.`, templateId: decimalAnswerMode ? 'division-exact-decimal' : 'division-exact-integer'
    });
  }

  function fractionDecimalQuestion() {
    const template = randomInt(1, 7);
    const den = choice([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    let num = randomInt(1, den - 1);
    while (gcd(num, den) !== 1) num = randomInt(1, den - 1);
    const value = rational(num, den);

    if (template === 1) {
      const recurring = decimalPlacesForDenominator(value.den) == null;
      const answer = formatRational(value, 'decimal');
      return makeNumericQuestion({
        category: 'mental', subtype: 'fractions', subtypeLabel: MENTAL_SUBTYPES.fractions,
        prompt: `Convert ${num}/${den} to a decimal${recurring ? ' (3 d.p.)' : ''}.`, correct: value, correctDisplay: answer, style: 'decimal',
        approximateTolerance: recurring ? 0.0005 : 0,
        distractors: [rational(num, den * 10), rational(den, num), rational(num * 10, den)],
        explanation: `${num} ÷ ${den} ${recurring ? '≈' : '='} ${answer}${recurring ? ' to 3 decimal places' : ''}.`,
        fasterMethod: den === 8 ? 'Convert eighths using 1/8 = 0.125.' : 'Use a familiar fraction conversion or scale the denominator where possible.',
        templateId: 'fraction-to-decimal'
      });
    }
    if (template === 2) {
      const percentValue = mulR(value, rational(100, 1));
      const recurring = decimalPlacesForDenominator(percentValue.den) == null;
      const answer = formatRational(value, 'percent');
      return makeNumericQuestion({
        category: 'mental', subtype: 'fractions', subtypeLabel: MENTAL_SUBTYPES.fractions,
        prompt: `Convert ${num}/${den} to a percentage${recurring ? ' (2 d.p.)' : ''}.`, correct: value, correctDisplay: answer, style: 'percent', allowPercent: true,
        approximateTolerance: recurring ? 0.00005 : 0,
        distractors: [rational(num, den * 100), rational(den, num * 100), rational(num * 10, den)],
        explanation: `${num}/${den} × 100% ${recurring ? '≈' : '='} ${answer}${recurring ? ' to 2 decimal places' : ''}.`,
        fasterMethod: 'Convert the fraction to a decimal, then multiply by 100.', templateId: 'fraction-to-percent'
      });
    }
    if (template === 3) {
      const decimalDen = choice([10, 20, 25, 50, 100]);
      const decimalNum = randomInt(1, decimalDen - 1);
      const r = rational(decimalNum, decimalDen);
      return makeNumericQuestion({
        category: 'mental', subtype: 'fractions', subtypeLabel: MENTAL_SUBTYPES.fractions,
        prompt: `Write ${trimDecimal(decimalNum / decimalDen, 3)} as a fraction in simplest form.`, correct: r, style: 'fraction',
        distractors: [rational(decimalNum, 100), rational(decimalDen, decimalNum), rational(decimalNum + 1, decimalDen)],
        explanation: `${trimDecimal(decimalNum / decimalDen, 3)} = ${decimalNum}/${decimalDen} = ${formatRational(r, 'fraction')} in simplest form.`,
        fasterMethod: 'Write the decimal over a power of ten, then divide numerator and denominator by their greatest common factor.', templateId: 'decimal-to-fraction'
      });
    }
    if (template === 4) {
      const a = rational(randomInt(1, 5), choice([4, 6, 8, 10, 12]));
      const b = rational(randomInt(1, 5), choice([4, 6, 8, 10, 12]));
      const op = Math.random() < 0.5 ? '+' : '−';
      const result = op === '+' ? addR(a, b) : subR(a, b);
      return makeNumericQuestion({
        category: 'mental', subtype: 'fractions', subtypeLabel: MENTAL_SUBTYPES.fractions,
        prompt: `${formatRational(a, 'fraction')} ${op} ${formatRational(b, 'fraction')}`, correct: result, style: 'fraction',
        distractors: [rational(op === '+' ? a.num + b.num : a.num - b.num, a.den + b.den), rational(result.num + 1, result.den), rational(result.num, result.den + 1)],
        explanation: `Use a common denominator of ${lcm(a.den, b.den)}. The result simplifies to ${formatRational(result, 'fraction')}.`,
        fasterMethod: a.den === b.den ? 'The denominators already match; combine the numerators.' : 'Cross-scale to the lowest common denominator.', templateId: 'fraction-arithmetic',
        dedupeKey: op === '+'
          ? `mental:fraction-add:${[`${a.num}/${a.den}`, `${b.num}/${b.den}`].sort().join('|')}`
          : `mental:fraction-sub:${a.num}/${a.den}|${b.num}/${b.den}`
      });
    }
    if (template === 5) {
      const a = rational(randomInt(1, 8), choice([5, 7, 8, 9, 10, 11, 12]));
      const b = rational(randomInt(1, 8), choice([5, 7, 8, 9, 10, 11, 12]));
      if (equalR(a, b)) return fractionDecimalQuestion();
      const bigger = toNumber(a) > toNumber(b) ? a : b;
      const correctAnswer = formatRational(bigger, 'fraction');
      const options = makeOptions(correctAnswer, [formatRational(toNumber(a) > toNumber(b) ? b : a, 'fraction'), 'They are equal', 'Cannot be determined']);
      return {
        id: uid('mental'), category: 'mental', subtype: 'fractions', subtypeLabel: MENTAL_SUBTYPES.fractions,
        prompt: `Which is larger: ${formatRational(a, 'fraction')} or ${formatRational(b, 'fraction')}?`, options: options.options, correctIndex: options.correctIndex,
        correctAnswer, correctValue: bigger, answerStyle: 'fraction', allowPercent: false,
        explanation: `Cross-multiply: compare ${a.num} × ${b.den} = ${a.num * b.den} with ${b.num} × ${a.den} = ${b.num * a.den}. Therefore ${correctAnswer} is larger.`,
        fasterMethod: 'Cross-multiply; there is no need to calculate either decimal.', method: '', assumptions: '', templateId: 'compare-fractions',
        dedupeKey: `mental:compare-fractions:${[`${a.num}/${a.den}`, `${b.num}/${b.den}`].sort().join('|')}`
      };
    }
    if (template === 6) {
      const percent = choice([5, 6.25, 8, 10, 12.5, 15, 16, 20, 22.5, 25, 30, 32, 35, 37.5, 40, 45, 50, 55, 60, 62.5, 65, 70, 75, 80, 85, 87.5, 90, 92.5, 95]);
      const r = rational(Math.round(percent * 10), 1000);
      return makeNumericQuestion({
        category: 'mental', subtype: 'fractions', subtypeLabel: MENTAL_SUBTYPES.fractions,
        prompt: `Convert ${percent}% to a decimal.`, correct: r, style: 'decimal',
        distractors: [rational(Math.round(percent * 10), 100), rational(Math.round(percent * 10), 10000), rational(Math.round(percent), 1000)],
        explanation: `${percent}% = ${percent} ÷ 100 = ${formatRational(r, 'decimal')}.`,
        fasterMethod: 'Move the decimal point two places left.', templateId: 'percent-to-decimal'
      });
    }

    // Build the ordering problem from a broad pool of reduced proper fractions rather
    // than recycling one fixed triple. Fractions that are extremely close together
    // are rejected so the task remains quick numerical comparison rather than trivia.
    const fractionPool = [];
    const seenFractions = new Set();
    for (let denominator = 2; denominator <= 12; denominator += 1) {
      for (let numerator = 1; numerator < denominator; numerator += 1) {
        const r = rational(numerator, denominator);
        const key = `${r.num}/${r.den}`;
        if (!seenFractions.has(key)) {
          seenFractions.add(key);
          fractionPool.push({ r, label: formatRational(r, 'fraction') });
        }
      }
    }
    let selected = null;
    for (let attempt = 0; attempt < 100 && !selected; attempt += 1) {
      const candidate = sampleDistinct(fractionPool, 3);
      const values = candidate.map((item) => toNumber(item.r)).sort((a, b) => a - b);
      if (values[1] - values[0] >= 0.035 && values[2] - values[1] >= 0.035) selected = candidate;
    }
    if (!selected) return fractionDecimalQuestion();
    const chosen = shuffle(selected);
    const sorted = chosen.slice().sort((x, y) => toNumber(x.r) - toNumber(y.r));
    const correctAnswer = sorted.map((item) => item.label).join(' < ');
    const orders = [
      [0, 1, 2], [0, 2, 1], [1, 0, 2],
      [1, 2, 0], [2, 0, 1], [2, 1, 0]
    ].map((order) => order.map((index) => chosen[index].label).join(' < '));
    const mc = makeOptions(correctAnswer, orders.filter((value) => value !== correctAnswer));
    const canonicalSet = sorted.map((item) => `${item.r.num}/${item.r.den}`).join('|');
    return {
      id: uid('mental'), category: 'mental', subtype: 'fractions', subtypeLabel: MENTAL_SUBTYPES.fractions,
      prompt: `Order from smallest to largest: ${chosen.map((x) => x.label).join(', ')}`, options: mc.options, correctIndex: mc.correctIndex,
      correctAnswer, correctValue: sorted[0].r, answerStyle: 'text', allowPercent: false,
      explanation: `Convert to comparable decimals: ${chosen.map((x) => `${x.label} = ${trimDecimal(toNumber(x.r), 3)}`).join(', ')}.`,
      fasterMethod: 'Convert each value to a familiar decimal or percentage.', method: '', assumptions: '', templateId: 'order-equivalent-values',
      dedupeKey: `mental:order-fractions:${canonicalSet}`
    };
  }

  function percentageQuestion() {
    const template = randomInt(1, 7);
    if (template <= 2) {
      const percent = choice([5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 32.5, 35, 37.5, 40, 45, 50, 60, 62.5, 70, 75]);
      const base = choice([64, 72, 80, 96, 120, 144, 160, 180, 200, 224, 240, 250, 280, 300, 320, 340, 360, 400, 450, 480, 500, 600, 640, 800]);
      const result = rational(Math.round(percent * 10) * base, 1000);
      return makeNumericQuestion({
        category: 'mental', subtype: 'percentages', subtypeLabel: MENTAL_SUBTYPES.percentages,
        prompt: `${percent}% of ${base}`, correct: result, style: 'auto', allowPercent: false,
        distractors: [rational(Math.round(percent * 10) * base, 100), rational(Math.round(percent * 10) + base, 10), addR(result, rational(base, 10))],
        explanation: `${percent}% of ${base} = ${percent / 100} × ${base} = ${formatRational(result, 'auto')}.`,
        fasterMethod: percent === 15 ? 'Find 10% and 5%, then add.' : percent === 12.5 ? '12.5% is one eighth.' : 'Break the percentage into familiar parts.',
        templateId: 'percentage-of-number'
      });
    }
    if (template === 3) {
      const percent = choice([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
      const original = choice([64, 80, 96, 100, 120, 144, 160, 180, 200, 240, 280, 300, 320, 360, 400, 480]);
      const increase = Math.random() < 0.5;
      const multiplier = increase ? rational(100 + percent, 100) : rational(100 - percent, 100);
      const result = mulR(rational(original, 1), multiplier);
      return makeNumericQuestion({
        category: 'mental', subtype: 'percentages', subtypeLabel: MENTAL_SUBTYPES.percentages,
        prompt: `${original} ${increase ? 'increased' : 'decreased'} by ${percent}%`, correct: result, style: 'auto',
        distractors: [rational(original + (increase ? percent : -percent), 1), rational(original + (increase ? -1 : 1) * Math.round(original * percent / 100), 1), rational(Math.round(toNumber(result)) + 10, 1)],
        explanation: `${percent}% of ${original} is ${original * percent / 100}; ${increase ? 'add' : 'subtract'} it to get ${formatRational(result, 'auto')}.`,
        fasterMethod: `Multiply by ${increase ? 100 + percent : 100 - percent}% directly.`, templateId: increase ? 'percentage-increase' : 'percentage-decrease'
      });
    }
    if (template === 4) {
      const percent = choice([10, 20, 25, 40, 50, 60]);
      const original = choice([60, 80, 100, 120, 140, 160, 180, 200, 240, 280, 300, 320, 360, 400, 480, 600]);
      const final = original * (100 + percent) / 100;
      return makeNumericQuestion({
        category: 'mental', subtype: 'percentages', subtypeLabel: MENTAL_SUBTYPES.percentages,
        prompt: `After a ${percent}% increase, a value is ${final}. What was it originally?`, correct: rational(original, 1), style: 'auto',
        distractors: [rational(final - percent, 1), rational(Math.round(final * (100 - percent) / 100), 1), rational(final + percent, 1)],
        explanation: `The final value is ${100 + percent}% of the original, so ${final} ÷ ${(100 + percent) / 100} = ${original}.`,
        fasterMethod: `Divide by ${1 + percent / 100}; do not subtract ${percent}% of the final value.`, templateId: 'reverse-percentage'
      });
    }
    if (template === 5) {
      const p = choice([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
      const net = rational(-p * p, 10000);
      return makeNumericQuestion({
        category: 'mental', subtype: 'percentages', subtypeLabel: MENTAL_SUBTYPES.percentages,
        prompt: `A value falls by ${p}% and then rises by ${p}%. What is the net percentage change?`, correct: net, style: 'percent', allowPercent: true,
        distractors: [rational(0, 1), rational(p * p, 10000), rational(-p, 100)],
        explanation: `Use a base of 100: 100 × ${(100 - p) / 100} × ${(100 + p) / 100} = ${100 - p * p / 100}. The net change is ${formatRational(net, 'percent')}.`,
        fasterMethod: `Equal fall and rise of p% gives a net fall of p²/100 percent.`, templateId: 'consecutive-percentage-change'
      });
    }
    if (template === 6) {
      const before = choice([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
      const after = before + choice([3, 5, 7, 10, 12, 15, 20]);
      const diff = rational(after - before, 1);
      return makeNumericQuestion({
        category: 'mental', subtype: 'percentages', subtypeLabel: MENTAL_SUBTYPES.percentages,
        prompt: `A rate rises from ${before}% to ${after}%. By how many percentage points?`, correct: diff, style: 'auto', allowPercent: false,
        distractors: [rational(Math.round((after - before) * 100 / before), 1), rational(after, 1), rational(before, 1)],
        explanation: `${after}% − ${before}% = ${after - before} percentage points.`,
        fasterMethod: 'Percentage points are the direct difference between the two rates.', templateId: 'percentage-points'
      });
    }
    const cost = choice([30, 40, 48, 50, 60, 72, 80, 90, 100, 120, 144, 150, 160, 200, 240]);
    const profitPercent = choice([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    const selling = cost * (100 + profitPercent) / 100;
    return makeNumericQuestion({
      category: 'mental', subtype: 'percentages', subtypeLabel: MENTAL_SUBTYPES.percentages,
      prompt: `An item costs £${cost} and is sold for £${selling}. What is the profit percentage?`, correct: rational(profitPercent, 100), style: 'percent', allowPercent: true,
      distractors: [rational(Math.round((selling - cost) * 100 / selling), 100), rational(Math.round((selling - cost) * 10), 1000), rational(profitPercent + 10, 100)],
      explanation: `Profit = £${selling - cost}. Profit percentage = ${selling - cost} ÷ ${cost} × 100% = ${profitPercent}%.`,
      fasterMethod: 'Profit percentage uses cost price as the denominator.', templateId: 'profit-percentage'
    });
  }

  function missingNumberQuestion() {
    const template = randomInt(1, 6);
    if (template === 1) {
      const x = randomInt(-45, 220); const b = randomInt(25, 140); const total = x + b;
      return makeNumericQuestion({ category: 'mental', subtype: 'missing', subtypeLabel: MENTAL_SUBTYPES.missing, prompt: `? + ${b} = ${total}`, correct: rational(x, 1), style: 'auto', distractors: [rational(x + 10, 1), rational(x - 10, 1), rational(total + b, 1)], explanation: `${total} − ${b} = ${x}.`, fasterMethod: 'Undo addition with subtraction.', templateId: 'missing-addition' });
    }
    if (template === 2) {
      const a = randomInt(12, 38); const x = randomInt(18, 85); const product = a * x;
      return makeNumericQuestion({ category: 'mental', subtype: 'missing', subtypeLabel: MENTAL_SUBTYPES.missing, prompt: `${a} × ? = ${product}`, correct: rational(x, 1), style: 'auto', distractors: [rational(x + 10, 1), rational(x - 10, 1), rational(x + a, 1)], explanation: `${product} ÷ ${a} = ${x}.`, fasterMethod: 'Undo multiplication with exact division.', templateId: 'missing-multiplication' });
    }
    if (template === 3) {
      const divisor = choice([8, 12, 16, 20, 24, 25, 32, 40]); const result = randomInt(18, 120); const x = divisor * result;
      return makeNumericQuestion({ category: 'mental', subtype: 'missing', subtypeLabel: MENTAL_SUBTYPES.missing, prompt: `? ÷ ${divisor} = ${result}`, correct: rational(x, 1), style: 'auto', distractors: [rational(x + 10, 1), rational(x - 10, 1), rational(result * (divisor + 1), 1)], explanation: `${result} × ${divisor} = ${x}.`, fasterMethod: 'Undo division with multiplication.', templateId: 'missing-division' });
    }
    if (template === 4) {
      // e.g. ? / 0.05 = 720000
      const divisor = choice([rational(1, 20), rational(1, 10), rational(1, 8), rational(1, 5), rational(1, 4)]);
      const x = rational(randomInt(12, 96) * 1000, 1);
      const result = divR(x, divisor);
      const divisorText = formatRational(divisor, 'decimal');
      return makeNumericQuestion({
        category: 'mental', subtype: 'missing', subtypeLabel: MENTAL_SUBTYPES.missing,
        prompt: `? ÷ ${divisorText} = ${formatRational(result, 'auto')}`, correct: x, style: 'auto',
        distractors: [rational(x.num + 1000, 1), rational(x.num - 1000, 1), rational(x.num * 10, 1)],
        explanation: `Multiply both sides by ${divisorText}: ${formatRational(result, 'auto')} × ${divisorText} = ${x.num}.`,
        fasterMethod: `Dividing by ${divisorText} is the same as multiplying by ${divisor.den}; reverse it by multiplying the result by ${divisorText}.`, templateId: 'missing-decimal-division'
      });
    }
    if (template === 5) {
      const a = rational(randomInt(18, 89), 100);
      const b = rational(randomInt(11, 78), 1000);
      const total = addR(a, b);
      return makeNumericQuestion({
        category: 'mental', subtype: 'missing', subtypeLabel: MENTAL_SUBTYPES.missing,
        prompt: `? + ${formatRational(b, 'decimal')} = ${formatRational(total, 'decimal')}`, correct: a, style: 'decimal',
        distractors: [addR(a, rational(1, 100)), subR(a, rational(1, 100)), rational(a.num, a.den * 10)],
        explanation: `${formatRational(total, 'decimal')} − ${formatRational(b, 'decimal')} = ${formatRational(a, 'decimal')}.`,
        fasterMethod: 'Align the decimal places and subtract to isolate the missing value.', templateId: 'missing-decimal-addition'
      });
    }
    const percent = choice([5, 10, 12.5, 15, 20, 25, 30, 37.5, 40, 50, 60, 62.5, 75, 80]);
    const x = choice([80, 96, 120, 144, 160, 180, 200, 224, 240, 280, 300, 320, 360, 400, 480, 500, 600, 640, 720, 800, 960]);
    const percentR = rational(Math.round(percent * 10), 1000);
    const result = mulR(rational(x, 1), percentR);
    return makeNumericQuestion({ category: 'mental', subtype: 'missing', subtypeLabel: MENTAL_SUBTYPES.missing, prompt: `${percent}% of ? = ${formatRational(result, 'auto')}`, correct: rational(x, 1), style: 'auto', distractors: [rational(x + 10, 1), rational(x - 10, 1), mulR(result, percentR)], explanation: `${formatRational(result, 'auto')} ÷ ${percent / 100} = ${x}.`, fasterMethod: `Scale from ${percent}% back to 100%.`, templateId: 'missing-percentage' });
  }

  function generateMentalQuestion() {
    const family = weightedChoice([
      { value: 'addsub', weight: 20 },
      { value: 'multiplication', weight: 20 },
      { value: 'division', weight: 15 },
      { value: 'fractions', weight: 20 },
      { value: 'percentages', weight: 15 },
      { value: 'missing', weight: 10 }
    ]);
    if (family === 'addsub') return additionSubtractionQuestion();
    if (family === 'multiplication') return multiplicationQuestion();
    if (family === 'division') return divisionQuestion();
    if (family === 'fractions') return fractionDecimalQuestion();
    if (family === 'percentages') return percentageQuestion();
    return missingNumberQuestion();
  }

  function firstDifferencesSequence() {
    const template = randomInt(1, 3);
    let terms = [];
    let next;
    let rule;
    let explanation;
    let templateId;

    if (template === 1) {
      const start = randomInt(-12, 25); const d = choice([-9, -7, -5, 4, 6, 8, 11, 13]);
      terms = Array.from({ length: 6 }, (_, i) => start + i * d); next = start + 6 * d;
      rule = { type: 'constantDifference', start, difference: d };
      explanation = `Add ${d} each time. The next term is ${terms[5]} ${d >= 0 ? '+' : '−'} ${Math.abs(d)} = ${next}.`;
      templateId = 'seq-constant-difference';
    } else if (template === 2) {
      const start = randomInt(1, 15); const d0 = randomInt(1, 5); const delta = randomInt(1, 4);
      terms = [start]; let d = d0;
      for (let i = 1; i < 6; i += 1) { terms.push(terms[i - 1] + d); d += delta; }
      next = terms[5] + d;
      rule = { type: 'arithmeticDifferences', start, firstDifference: d0, differenceStep: delta };
      const diffs = terms.slice(1).map((x, i) => x - terms[i]);
      explanation = `The differences are ${diffs.join(', ')}, increasing by ${delta}. The next difference is ${d}, so the next term is ${next}.`;
      templateId = 'seq-increasing-differences';
    } else {
      const a = randomInt(1, 4); const b = randomInt(-5, 8); const c = randomInt(0, 8);
      terms = Array.from({ length: 6 }, (_, i) => a * (i + 1) ** 2 + b * (i + 1) + c);
      next = a * 7 ** 2 + b * 7 + c;
      rule = { type: 'quadratic', a, b, c, startN: 1 };
      const diffs = terms.slice(1).map((x, i) => x - terms[i]);
      const seconds = diffs.slice(1).map((x, i) => x - diffs[i]);
      explanation = `The first differences are ${diffs.join(', ')} and the second differences are constant at ${seconds[0]}. Continue the first-difference pattern to get ${next}.`;
      templateId = 'seq-constant-second-difference';
    }
    return sequenceQuestionFromRule(terms, next, 'differences', rule, explanation, templateId);
  }

  function ratioSequence() {
    const ratio = choice([2, 3, 4, 5, rational(3, 2), rational(4, 3)]);
    let start;
    let terms;
    let next;
    if (typeof ratio === 'number') {
      const maxStart = ratio === 5 ? 4 : ratio === 4 ? 12 : 18;
      start = randomInt(1, maxStart);
      terms = Array.from({ length: 6 }, (_, i) => start * ratio ** i);
      next = start * ratio ** 6;
    } else {
      if (ratio.num === 3) start = 64 * randomInt(1, 5);
      else start = 729 * randomInt(1, 3);
      terms = [start];
      for (let i = 1; i < 6; i += 1) terms.push(terms[i - 1] * ratio.num / ratio.den);
      next = terms[5] * ratio.num / ratio.den;
      if (terms.some((x) => !Number.isSafeInteger(x)) || !Number.isSafeInteger(next)) return ratioSequence();
    }
    const ratioText = typeof ratio === 'number' ? String(ratio) : `${ratio.num}/${ratio.den}`;
    return sequenceQuestionFromRule(terms, next, 'ratios', { type: 'geometric', start, ratio: ratioText }, `Multiply by ${ratioText} each time. The next term is ${next}.`, 'seq-geometric');
  }

  function alternatingSequence() {
    const template = randomInt(1, 3);
    if (template === 1) {
      const start = randomInt(3, 20); const add = randomInt(3, 10); const subtract = randomInt(1, add - 1);
      const terms = [start];
      for (let i = 1; i < 7; i += 1) terms.push(terms[i - 1] + (i % 2 === 1 ? add : -subtract));
      return sequenceQuestionFromRule(terms.slice(0, 6), terms[6], 'alternating', { type: 'alternatingAddSubtract', start, add, subtract }, `Alternate +${add}, −${subtract}. After ${terms[5]}, subtract ${subtract} to get ${terms[6]}.`, 'seq-alternating-add-subtract');
    }
    if (template === 2) {
      const oddStart = randomInt(2, 12); const evenStart = randomInt(20, 50); const oddD = randomInt(2, 7); const evenD = -randomInt(2, 8);
      const terms = [];
      for (let i = 0; i < 3; i += 1) { terms.push(oddStart + i * oddD); terms.push(evenStart + i * evenD); }
      const next = oddStart + 3 * oddD;
      return sequenceQuestionFromRule(terms, next, 'alternating', { type: 'interleavedArithmetic', oddStart, evenStart, oddDifference: oddD, evenDifference: evenD }, `Odd-position terms increase by ${oddD}: ${terms[0]}, ${terms[2]}, ${terms[4]}, ${next}. Even-position terms decrease by ${Math.abs(evenD)}.`, 'seq-interleaved-arithmetic');
    }
    const start = randomInt(2, 8); const multiply = choice([2, 3]); const divide = multiply; const add = randomInt(3, 9);
    const terms = [start];
    const operations = [];
    for (let i = 1; i < 6; i += 1) {
      if (i % 2 === 1) { terms.push(terms[i - 1] * multiply); operations.push(`×${multiply}`); }
      else { terms.push(terms[i - 1] / divide + add); operations.push(`÷${divide}, +${add}`); }
    }
    if (terms.some((x) => !Number.isInteger(x))) return alternatingSequence();
    const next = terms[5] / divide + add;
    if (!Number.isInteger(next)) return alternatingSequence();
    return sequenceQuestionFromRule(terms, next, 'alternating', { type: 'alternatingMultiplyDivideAdjust', start, multiply, divide, add }, `Alternate ×${multiply}, then ÷${divide} + ${add}. Apply ÷${divide} + ${add} to ${terms[5]} to get ${next}.`, 'seq-alternating-multiply-adjust');
  }

  function recurrenceSequence() {
    const template = randomInt(1, 3);
    if (template === 1) {
      const a = randomInt(1, 6); const b = randomInt(a + 1, 10);
      const terms = [a, b];
      while (terms.length < 7) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
      return sequenceQuestionFromRule(terms.slice(0, 6), terms[6], 'recurrences', { type: 'sumPreviousTwo', first: a, second: b }, `Each term is the sum of the previous two: ${terms[4]} + ${terms[5]} = ${terms[6]}.`, 'seq-fibonacci-style');
    }
    if (template === 2) {
      const start = randomInt(1, 8); const multiplier = choice([2, 3]); const adjust = randomInt(1, 5);
      const add = Math.random() < 0.6;
      const terms = [start];
      for (let i = 1; i < 6; i += 1) terms.push(terms[i - 1] * multiplier + (add ? adjust : -adjust));
      const next = terms[5] * multiplier + (add ? adjust : -adjust);
      return sequenceQuestionFromRule(terms, next, 'recurrences', { type: add ? 'multiplyAdd' : 'multiplySubtract', start, multiplier, adjust }, `Multiply by ${multiplier}, then ${add ? 'add' : 'subtract'} ${adjust}. The next term is ${next}.`, add ? 'seq-multiply-add' : 'seq-multiply-subtract');
    }
    const start = randomInt(2, 10); const incrementStart = randomInt(1, 4);
    const terms = [start];
    for (let i = 1; i < 6; i += 1) terms.push(terms[i - 1] * 2 + (incrementStart + i - 1));
    const next = terms[5] * 2 + incrementStart + 5;
    return sequenceQuestionFromRule(terms, next, 'recurrences', { type: 'multiplyIncreasingAdjust', start, multiplier: 2, incrementStart }, `Multiply by 2, then add ${incrementStart}, ${incrementStart + 1}, ${incrementStart + 2}, and so on. Next add ${incrementStart + 5}, giving ${next}.`, 'seq-multiply-increasing-adjust');
  }

  function familiarFamilySequence() {
    const template = randomInt(1, 5);
    let terms;
    let next;
    let explanation;
    let rule;
    let templateId;
    if (template === 1) {
      const start = randomInt(1, 8);
      terms = Array.from({ length: 6 }, (_, i) => (start + i) ** 2); next = (start + 6) ** 2;
      explanation = `These are consecutive squares from ${start}² to ${start + 5}². The next is ${start + 6}² = ${next}.`;
      rule = { type: 'squares', start }; templateId = 'seq-squares';
    } else if (template === 2) {
      const start = randomInt(1, 5);
      terms = Array.from({ length: 5 }, (_, i) => (start + i) ** 3); next = (start + 5) ** 3;
      explanation = `These are consecutive cubes. The next is ${start + 5}³ = ${next}.`;
      rule = { type: 'cubes', start }; templateId = 'seq-cubes';
    } else if (template === 3) {
      const start = randomInt(1, 10);
      const triangle = (n) => n * (n + 1) / 2;
      terms = Array.from({ length: 6 }, (_, i) => triangle(start + i)); next = triangle(start + 6);
      explanation = `These are triangular numbers; the successive additions are ${start + 1}, ${start + 2}, and so on. The next term is ${next}.`;
      rule = { type: 'triangular', start }; templateId = 'seq-triangular';
    } else if (template === 4) {
      const start = choice([1, 2, 3]);
      const factorial = (n) => { let x = 1; for (let i = 2; i <= n; i += 1) x *= i; return x; };
      terms = Array.from({ length: 5 }, (_, i) => factorial(start + i)); next = factorial(start + 5);
      explanation = `These are factorials: ${start}!, ${start + 1}!, … . The next term is ${start + 5}! = ${next}.`;
      rule = { type: 'factorials', start }; templateId = 'seq-factorials';
    } else {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
      const start = randomInt(0, primes.length - 7);
      terms = primes.slice(start, start + 6); next = primes[start + 6];
      explanation = `These are consecutive prime numbers. The next prime after ${terms[5]} is ${next}.`;
      rule = { type: 'primes', startIndex: start }; templateId = 'seq-primes';
    }
    return sequenceQuestionFromRule(terms, next, 'families', rule, explanation, templateId);
  }

  function digitSequence() {
    let seed = randomInt(12, 89);
    while (seed % 11 === 0 || seed % 10 === 0) seed = randomInt(12, 89);
    const increment = choice([9, 18, 27]);
    const reverse = (n) => Number(String(n).split('').reverse().join(''));
    const terms = [seed];
    for (let i = 1; i < 6; i += 1) {
      const previous = terms[i - 1];
      terms.push(i % 2 === 1 ? reverse(previous) : previous + increment);
    }
    const next = terms[5] + increment;
    if (terms.some((x) => x < 10 || x > 999) || next > 999 || terms.some((value, index) => index > 0 && value === terms[index - 1])) return digitSequence();
    return sequenceQuestionFromRule(terms, next, 'digits', { type: 'alternateReverseAdd', seed, increment }, `Alternate reversing the digits and adding ${increment}. After reversing to ${terms[5]}, add ${increment} to get ${next}.`, 'seq-clear-digit-reversal');
  }

  function sequenceQuestionFromRule(terms, next, subtype, rule, explanation, templateId) {
    if (!Array.isArray(terms) || terms.length < 5 || terms.some((x) => !Number.isFinite(x) || Math.abs(x) > 100000) || !Number.isFinite(next) || Math.abs(next) > 100000) throw new Error('Invalid sequence values');
    const last = terms[terms.length - 1];
    const previousDifference = last - terms[terms.length - 2];
    const candidates = [
      next + 1, next - 1, next + 2, next - 2,
      next + previousDifference, next - previousDifference,
      last + 1, last - 1, last + previousDifference,
      Math.round((next + last) / 2), next * 2, Math.round(next / 2)
    ];
    const distractors = [];
    for (const candidate of candidates) {
      const text = String(candidate);
      if (Number.isFinite(candidate) && candidate !== next && Math.abs(candidate) <= 100000 && !distractors.includes(text)) distractors.push(text);
      if (distractors.length >= 3) break;
    }
    let offset = 3;
    while (distractors.length < 3) {
      const candidate = next + offset;
      const text = String(candidate);
      if (candidate !== next && !distractors.includes(text)) distractors.push(text);
      offset += 1;
    }
    const mc = makeOptions(String(next), distractors);
    return {
      id: uid('sequence'), category: 'sequences', subtype, subtypeLabel: SEQUENCE_SUBTYPES[subtype],
      prompt: `${terms.join(', ')}, ?`, terms: terms.slice(), options: mc.options, correctIndex: mc.correctIndex,
      correctAnswer: String(next), correctValue: rational(next, 1), answerStyle: 'auto', allowPercent: false,
      patternFamily: subtype, rule, explanation, fasterMethod: 'Check first differences, second differences, ratios, alternating terms, recurrences, then familiar families.',
      method: 'Pattern recognition', assumptions: '', templateId,
      sequenceCheck: { terms: terms.slice(), next }
    };
  }

  function generateSequenceQuestion() {
    const family = weightedChoice([
      { value: 'differences', weight: 30 },
      { value: 'ratios', weight: 15 },
      { value: 'alternating', weight: 20 },
      { value: 'recurrences', weight: 20 },
      { value: 'families', weight: 10 },
      { value: 'digits', weight: 5 }
    ]);
    if (family === 'differences') return firstDifferencesSequence();
    if (family === 'ratios') return ratioSequence();
    if (family === 'alternating') return alternatingSequence();
    if (family === 'recurrences') return recurrenceSequence();
    if (family === 'families') return familiarFamilySequence();
    return digitSequence();
  }

  function nCr(n, r) {
    if (r < 0 || r > n) return 0;
    let k = Math.min(r, n - r);
    let result = 1;
    for (let i = 1; i <= k; i += 1) result = result * (n - k + i) / i;
    return Math.round(result);
  }

  function probabilityQuestion(config) {
    const correct = rational(config.correct.num, config.correct.den);
    const correctAnswer = config.displayStyle === 'currency' ? formatRational(correct, 'currency') : probabilityDisplay(correct);
    let distractorDisplays;
    if (config.displayStyle === 'currency') {
      distractorDisplays = numericDistractors(correct, 'currency', config.distractors);
    } else {
      distractorDisplays = probabilityDistractors(correct, config.distractors).map(probabilityDisplay);
    }
    const mc = makeOptions(correctAnswer, distractorDisplays);
    return {
      id: uid('probability'), category: 'probability', subtype: config.subtype, subtypeLabel: PROBABILITY_SUBTYPES[config.subtype],
      prompt: config.prompt, options: mc.options, correctIndex: mc.correctIndex, correctAnswer, correctValue: correct,
      answerStyle: config.displayStyle || 'probability', allowPercent: true,
      explanation: config.explanation, fasterMethod: config.fasterMethod || '', method: config.method,
      assumptions: config.assumptions, templateId: config.templateId, dedupeKey: config.dedupeKey || ''
    };
  }

  function fairCoinExactlyQuestion() {
    const n = randomInt(3, 10); const k = randomInt(1, n - 1);
    const numerator = nCr(n, k); const denominator = 2 ** n;
    return probabilityQuestion({ subtype: 'coins', prompt: `A fair coin is flipped ${n} times. What is the probability of exactly ${k} heads?`, correct: rational(numerator, denominator), distractors: [rational(k, n), rational(1, 2 ** n), rational(nCr(n, Math.max(0, k - 1)), denominator)], method: 'Binomial probability', assumptions: 'Flips are independent and the coin is fair.', explanation: `Choose the ${k} head positions in ${nCr(n, k)} ways. Each sequence has probability 1/${denominator}, so the probability is ${nCr(n, k)}/${denominator} = ${formatRational(rational(numerator, denominator), 'fraction')}.`, fasterMethod: `Use C(${n}, ${k}) / 2^${n}.`, templateId: 'prob-fair-coin-exactly' });
  }

  function biasedCoinQuestion() {
    const p = choice([rational(1, 5), rational(1, 4), rational(3, 10), rational(1, 3), rational(2, 5), rational(3, 5), rational(2, 3), rational(7, 10), rational(3, 4), rational(4, 5)]);
    const pNum = p.num; const pDen = p.den;
    const n = randomInt(3, 7); const k = randomInt(1, n - 1);
    const numerator = nCr(n, k) * pNum ** k * (pDen - pNum) ** (n - k);
    const denominator = pDen ** n;
    return probabilityQuestion({ subtype: 'coins', prompt: `A coin lands heads with probability ${pNum}/${pDen}. It is flipped ${n} times independently. What is the probability of exactly ${k} heads?`, correct: rational(numerator, denominator), distractors: [rational(nCr(n, k) * pNum ** k, pDen ** k), rational(pNum ** k * (pDen - pNum) ** (n - k), denominator), rational(k * pNum, n * pDen)], method: 'Binomial probability', assumptions: 'Flips are independent and the head probability is constant.', explanation: `C(${n}, ${k})(${pNum}/${pDen})^${k}(${pDen - pNum}/${pDen})^${n - k} = ${formatRational(rational(numerator, denominator), 'fraction')}.`, templateId: 'prob-biased-coin-exactly' });
  }

  function atLeastOneQuestion() {
    const sides = choice([4, 6, 8, 10, 12, 20]); const rolls = randomInt(2, 5); const targetCount = randomInt(1, Math.min(3, sides - 1));
    if (targetCount >= sides) return atLeastOneQuestion();
    const noTarget = rational((sides - targetCount) ** rolls, sides ** rolls);
    const result = subR(rational(1, 1), noTarget);
    return probabilityQuestion({ subtype: 'dice', prompt: `A fair ${sides}-sided die is rolled ${rolls} times. What is the probability of seeing at least one of ${targetCount === 1 ? 'a specified face' : `${targetCount} specified faces`}?`, correct: result, distractors: [rational(targetCount * rolls, sides), noTarget, rational(targetCount ** rolls, sides ** rolls)], method: 'Complement counting', assumptions: `Rolls are independent; each of the ${sides} faces is equally likely.`, explanation: `The probability of avoiding the target ${targetCount === 1 ? 'face' : 'faces'} on every roll is ((${sides - targetCount}/${sides})^${rolls}). Subtract from 1 to get ${formatRational(result, 'fraction')}.`, fasterMethod: 'For “at least one,” calculate 1 minus the probability of none.', templateId: 'prob-at-least-one' });
  }

  function twoDiceSumQuestion() {
    const sides = choice([4, 6, 8, 10]);
    const target = randomInt(3, 2 * sides - 1);
    const ways = target <= sides + 1 ? target - 1 : 2 * sides + 1 - target;
    const totalOutcomes = sides ** 2;
    return probabilityQuestion({ subtype: 'dice', prompt: `Two fair ${sides}-sided dice numbered 1 to ${sides} are rolled. What is the probability that their total is ${target}?`, correct: rational(ways, totalOutcomes), distractors: [rational(1, sides), rational(target, totalOutcomes), rational(Math.max(1, sides - ways), totalOutcomes)], method: 'Enumeration', assumptions: `The dice are independent and all ${totalOutcomes} ordered outcomes are equally likely.`, explanation: `There are ${ways} ordered pairs summing to ${target} out of ${totalOutcomes} equally likely outcomes, so the probability is ${formatRational(rational(ways, totalOutcomes), 'fraction')}.`, fasterMethod: `For two ${sides}-sided dice, the number of ways rises by one up to a total of ${sides + 1}, then falls symmetrically.`, templateId: 'prob-two-dice-sum' });
  }

  function diceConditionalQuestion() {
    const sides = choice([6, 8]);
    const variant = randomInt(1, 4);
    let condition;
    let success;
    let conditionText;
    let successText;
    if (variant === 1) {
      condition = (a, b) => (a + b) % 2 === 0;
      success = (a, b) => a === b;
      conditionText = 'the total is even';
      successText = 'the dice show the same number';
    } else if (variant === 2) {
      const threshold = randomInt(sides, sides + 3);
      condition = (a, b) => a + b >= threshold;
      success = (a, b) => a === b;
      conditionText = `the total is at least ${threshold}`;
      successText = 'the dice show the same number';
    } else if (variant === 3) {
      const shown = randomInt(2, sides - 1);
      const threshold = shown + randomInt(3, sides);
      condition = (a, b) => a === shown || b === shown;
      success = (a, b) => a + b >= threshold;
      conditionText = `at least one die shows ${shown}`;
      successText = `the total is at least ${threshold}`;
    } else {
      const threshold = randomInt(sides, sides + 2);
      condition = (a) => a % 2 === 0;
      success = (a, b) => a + b >= threshold;
      conditionText = 'the first die is even';
      successText = `the total is at least ${threshold}`;
    }
    const conditioned = [];
    const qualifying = [];
    for (let a = 1; a <= sides; a += 1) {
      for (let b = 1; b <= sides; b += 1) {
        if (condition(a, b)) {
          conditioned.push([a, b]);
          if (success(a, b)) qualifying.push([a, b]);
        }
      }
    }
    if (!conditioned.length || !qualifying.length || qualifying.length === conditioned.length) return diceConditionalQuestion();
    const correct = rational(qualifying.length, conditioned.length);
    return probabilityQuestion({ subtype: 'conditional', prompt: `Two fair ${sides}-sided dice numbered 1 to ${sides} are rolled. Given that ${conditionText}, what is the probability that ${successText}?`, correct, distractors: [rational(qualifying.length, sides ** 2), rational(conditioned.length, sides ** 2), rational(Math.max(1, qualifying.length - 1), conditioned.length)], method: 'Conditional probability by enumeration', assumptions: `The dice are independent; condition only on the ${conditioned.length} ordered outcomes satisfying the given information.`, explanation: `After conditioning, ${conditioned.length} ordered outcomes remain. ${qualifying.length} satisfy the required event, so the probability is ${qualifying.length}/${conditioned.length} = ${formatRational(correct, 'fraction')}.`, fasterMethod: 'Restrict the sample space to outcomes satisfying the condition, then count successes inside that smaller space.', templateId: 'prob-conditional-dice' });
  }

  function ballsWithoutReplacementQuestion() {
    const red = randomInt(3, 10); const blue = randomInt(3, 11); const total = red + blue;
    const bothRed = Math.random() < 0.5;
    const correct = bothRed ? rational(red * (red - 1), total * (total - 1)) : rational(2 * red * blue, total * (total - 1));
    const prompt = `A bag contains ${red} red and ${blue} blue balls. Two balls are drawn without replacement. What is the probability ${bothRed ? 'both are red' : 'one is red and one is blue'}?`;
    const explanation = bothRed
      ? `P(RR) = ${red}/${total} × ${red - 1}/${total - 1} = ${formatRational(correct, 'fraction')}.`
      : `Count both orders: P(RB or BR) = 2 × ${red}/${total} × ${blue}/${total - 1} = ${formatRational(correct, 'fraction')}.`;
    return probabilityQuestion({ subtype: 'sampling', prompt, correct, distractors: [rational(red * red, total * total), rational(red, total), rational(red * blue, total * (total - 1))], method: 'Sequential probability without replacement', assumptions: 'Each ball is equally likely to be drawn; the first ball is not returned.', explanation, templateId: bothRed ? 'prob-balls-both-without-replacement' : 'prob-balls-mixed-without-replacement' });
  }

  function ballsWithReplacementQuestion() {
    const red = randomInt(2, 9); const blue = randomInt(3, 11); const total = red + blue; const draws = randomInt(2, 5); const k = randomInt(1, draws - 1);
    const numerator = nCr(draws, k) * red ** k * blue ** (draws - k);
    const denominator = total ** draws;
    return probabilityQuestion({ subtype: 'sampling', prompt: `A bag contains ${red} red and ${blue} blue balls. A ball is drawn, replaced, and the bag is mixed; this is repeated ${draws} times. What is the probability of exactly ${k} red draw${k === 1 ? '' : 's'}?`, correct: rational(numerator, denominator), distractors: [rational(red ** k * blue ** (draws - k), denominator), rational(k * red, draws * total), rational(nCr(draws, k) * red ** k, total ** k)], method: 'Binomial probability', assumptions: 'Replacement makes the draws independent with constant red probability.', explanation: `C(${draws}, ${k})(${red}/${total})^${k}(${blue}/${total})^${draws - k} = ${formatRational(rational(numerator, denominator), 'fraction')}.`, templateId: 'prob-balls-with-replacement' });
  }

  function cardQuestion() {
    const template = randomInt(1, 3);
    const rankNames = ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings'];
    if (template === 1) {
      const selectedRanks = sampleDistinct(rankNames, randomInt(1, 4));
      const rankText = selectedRanks.length === 1
        ? selectedRanks[0]
        : `${selectedRanks.slice(0, -1).join(', ')} or ${selectedRanks[selectedRanks.length - 1]}`;
      const ranks = selectedRanks.length;
      return probabilityQuestion({ subtype: 'cards', prompt: `One card is drawn uniformly from a standard 52-card deck. What is the probability it is ${rankText}?`, correct: rational(4 * ranks, 52), distractors: [rational(ranks, 52), rational(4 + ranks, 52), rational(ranks, 13)], method: 'Direct counting', assumptions: 'A standard deck has 52 cards, four suits, and 13 ranks; no jokers.', explanation: `${ranks} selected rank${ranks === 1 ? '' : 's'} contain ${4 * ranks} cards, so the probability is ${4 * ranks}/52 = ${formatRational(rational(4 * ranks, 52), 'fraction')}.`, templateId: 'prob-card-specified-ranks' });
    }
    if (template === 2) {
      const group = choice([
        { label: 'face cards', count: 12 },
        { label: 'hearts', count: 13 },
        { label: 'diamonds', count: 13 },
        { label: 'clubs', count: 13 },
        { label: 'spades', count: 13 },
        { label: 'red cards', count: 26 },
        { label: 'black cards', count: 26 },
        { label: 'aces', count: 4 },
        { label: 'number cards from 2 through 10', count: 36 }
      ]);
      const correct = rational(group.count * (group.count - 1), 52 * 51);
      return probabilityQuestion({ subtype: 'cards', prompt: `Two cards are drawn from a standard 52-card deck without replacement. What is the probability both are ${group.label}?`, correct, distractors: [rational(group.count ** 2, 52 ** 2), rational(group.count, 52), rational(nCr(group.count, 2), nCr(52, 2) * 2)], method: 'Sequential probability without replacement', assumptions: `The deck is standard with no jokers; there are ${group.count} ${group.label}.`, explanation: `P = ${group.count}/52 × ${group.count - 1}/51 = ${formatRational(correct, 'fraction')}.`, templateId: 'prob-two-card-category' });
    }
    const rank = choice(rankNames);
    const rankDisplay = exact => exact === 1 ? (rank === 'sixes' ? 'six' : rank === 'jacks' ? 'jack' : rank === 'queens' ? 'queen' : rank === 'kings' ? 'king' : rank === 'aces' ? 'ace' : rank.endsWith('s') ? rank.slice(0, -1) : rank) : rank;
    const handSize = randomInt(4, 7);
    const exact = randomInt(1, Math.min(3, handSize - 1));
    const totalHands = nCr(52, handSize);
    const correct = rational(nCr(4, exact) * nCr(48, handSize - exact), totalHands);
    const withReplacementApproximation = rational(nCr(handSize, exact) * 4 ** exact * 48 ** (handSize - exact), 52 ** handSize);
    const allowsExtraRanks = rational(nCr(4, exact) * nCr(52 - exact, handSize - exact), totalHands);
    let atLeast = 0;
    for (let j = exact; j <= Math.min(4, handSize); j += 1) atLeast += nCr(4, j) * nCr(48, handSize - j);
    const atLeastExact = rational(atLeast, totalHands);
    return probabilityQuestion({ subtype: 'cards', prompt: `A ${handSize}-card hand is dealt uniformly from a standard 52-card deck. What is the probability it contains exactly ${exact} ${rankDisplay(exact)}?`, correct, distractors: [withReplacementApproximation, allowsExtraRanks, atLeastExact], method: 'Combinations', assumptions: 'Cards are dealt without replacement; order within the hand does not matter; no jokers.', explanation: `Choose ${exact} of the 4 ${rank} and ${handSize - exact} of the 48 other cards: C(4,${exact})C(48,${handSize - exact})/C(52,${handSize}) = ${formatRational(correct, 'fraction')}.`, templateId: 'prob-exact-rank-in-hand' });
  }

  function bayesCoinQuestion() {
    const fairCoins = randomInt(1, 5);
    const doubleHeadedCoins = randomInt(1, 4);
    const correct = rational(2 * doubleHeadedCoins, 2 * doubleHeadedCoins + fairCoins);
    return probabilityQuestion({ subtype: 'conditional', prompt: `A bag contains ${fairCoins} fair coin${fairCoins === 1 ? '' : 's'} and ${doubleHeadedCoins} double-headed coin${doubleHeadedCoins === 1 ? '' : 's'}. One coin is selected uniformly at random and flipped once; it shows heads. What is the probability the selected coin is double-headed?`, correct, distractors: [rational(doubleHeadedCoins, fairCoins + doubleHeadedCoins), rational(1, 2), rational(doubleHeadedCoins, 2 * doubleHeadedCoins + fairCoins)], method: 'Bayes’ theorem', assumptions: 'Each coin in the bag is equally likely to be selected; a fair coin has head probability 1/2 and a double-headed coin has head probability 1.', explanation: `Weight each possible selected coin by its chance of producing heads. Double-headed coins contribute ${doubleHeadedCoins}; fair coins contribute ${fairCoins}/2, so P(double-headed | H) = ${doubleHeadedCoins}/(${doubleHeadedCoins} + ${fairCoins}/2) = ${formatRational(correct, 'fraction')}.`, fasterMethod: 'Count each double-headed coin as two head-producing half-units and each fair coin as one.', templateId: 'prob-bayes-coins' });
  }

  function bayesTestQuestion() {
    const prevalence = choice([1, 2, 3, 4, 5, 8, 10]); const sensitivity = choice([80, 85, 90, 95, 98]); const falsePositive = choice([1, 2, 5, 8, 10, 15]);
    const numerator = prevalence * sensitivity;
    const denominator = prevalence * sensitivity + (100 - prevalence) * falsePositive;
    const correct = rational(numerator, denominator);
    return probabilityQuestion({ subtype: 'conditional', prompt: `In a population, ${prevalence}% have a condition. A test is positive for ${sensitivity}% of people with it and ${falsePositive}% of people without it. For a randomly selected person who tests positive, what is the probability they have the condition?`, correct, distractors: [rational(sensitivity, 100), rational(prevalence, 100), rational(prevalence * sensitivity, 10000)], method: 'Bayes’ theorem', assumptions: 'The stated rates apply to the population and the person is sampled at random.', explanation: `Using 10,000 people: expected true positives are ${prevalence * sensitivity}; expected false positives are ${(100 - prevalence) * falsePositive}. Therefore P(condition | positive) = ${numerator}/${denominator} = ${formatRational(correct, 'fraction')}.`, fasterMethod: 'Use a hypothetical population to convert rates into counts.', templateId: 'prob-bayes-test' });
  }

  function expectedValueQuestion() {
    const template = randomInt(1, 4);
    if (template === 1) {
      const win = choice([6, 8, 10, 12, 15, 18, 20, 24, 30]); const p = choice([15, 20, 25, 30, 35, 40, 50, 60]); const cost = choice([1, 2, 3, 4, 5, 6, 8]);
      const evPayout = rational(win * p, 100); const profit = subR(evPayout, rational(cost, 1));
      return probabilityQuestion({ subtype: 'ev', prompt: `A game pays £${win} with probability ${p / 100} and £0 otherwise. It costs £${cost} to play. What is the expected profit per play?`, correct: profit, distractors: [evPayout, rational(win - cost, 1), subR(rational(cost, 1), evPayout)], displayStyle: 'currency', method: 'Expected value', assumptions: 'The entry cost is paid every play and there are no other outcomes.', explanation: `Expected payout = ${p / 100} × £${win} = ${formatRational(evPayout, 'currency')}. Subtract the £${cost} cost: expected profit = ${formatRational(profit, 'currency')}.`, templateId: 'prob-expected-profit' });
    }
    if (template === 2) {
      const high = choice([8, 10, 12, 15, 18, 20, 24, 30, 40]); const low = choice([0, 1, 2, 3, 5, 6, 8]); const p = choice([15, 20, 25, 30, 35, 40, 50, 60, 70, 75]);
      const fair = addR(rational(high * p, 100), rational(low * (100 - p), 100));
      return probabilityQuestion({ subtype: 'ev', prompt: `A ticket pays £${high} with probability ${p / 100} and £${low} otherwise. What is its fair entry price?`, correct: fair, distractors: [rational(high * p, 100), rational((high + low), 2), rational(high - low, 1)], displayStyle: 'currency', method: 'Expected value / fair price', assumptions: 'Risk neutrality and no fees; a fair price gives zero expected profit.', explanation: `Fair price = ${p / 100} × £${high} + ${(100 - p) / 100} × £${low} = ${formatRational(fair, 'currency')}.`, templateId: 'prob-fair-price' });
    }
    if (template === 3) {
      const p = choice([15, 20, 25, 30, 35, 40, 45, 50, 60]); const win = choice([2, 3, 4, 5, 6, 8, 10]); const lose = choice([1, 2, 3, 4, 5]);
      const ev = subR(rational(p * win, 100), rational((100 - p) * lose, 100));
      return probabilityQuestion({ subtype: 'ev', prompt: `A bet wins £${win} with probability ${p / 100} and loses £${lose} otherwise. What is the expected profit?`, correct: ev, distractors: [rational(p * win, 100), rational(win - lose, 1), rational((100 - p) * lose, 100)], displayStyle: 'currency', method: 'Expected value', assumptions: 'The listed outcomes are exhaustive and mutually exclusive.', explanation: `EV = ${p / 100} × £${win} − ${(100 - p) / 100} × £${lose} = ${formatRational(ev, 'currency')}.`, templateId: 'prob-simple-bet-ev' });
    }
    const flips = randomInt(4, 16); const reward = choice([1, 2, 3, 4, 5]);
    const ev = rational(flips * reward, 2);
    return probabilityQuestion({ subtype: 'ev', prompt: `A fair coin is flipped ${flips} times. You receive £${reward} for each head. What is the expected total payout?`, correct: ev, distractors: [rational(flips * reward, 1), rational(reward, 2), rational(flips, 2)], displayStyle: 'currency', method: 'Linearity of expectation', assumptions: 'Each flip is fair; rewards add across flips.', explanation: `The expected number of heads is ${flips} × 1/2 = ${flips / 2}. Multiply by £${reward}: expected payout = ${formatRational(ev, 'currency')}.`, fasterMethod: 'Use linearity of expectation; no binomial expansion is needed.', templateId: 'prob-linearity-heads-payout' });
  }

  function combinationsQuestion() {
    const n = randomInt(7, 18); const k = randomInt(2, Math.min(7, n - 2));
    const result = rational(nCr(n, k), 1);
    return makeNumericQuestion({ category: 'probability', subtype: 'cards', subtypeLabel: PROBABILITY_SUBTYPES.cards, prompt: `How many distinct committees of ${k} people can be chosen from ${n} people?`, correct: result, style: 'auto', distractors: [rational(n ** k, 1), rational(nCr(n, k) * k, 1), rational(n * k, 1)], explanation: `Order does not matter, so use C(${n}, ${k}) = ${nCr(n, k)}.`, fasterMethod: `Use combinations, not permutations.`, method: 'Combinations', assumptions: 'Each committee is an unordered subset and no person can be selected twice.', templateId: 'prob-basic-combinations' });
  }

  function generateProbabilityQuestion() {
    const generator = weightedChoice([
      { value: fairCoinExactlyQuestion, weight: 11 },
      { value: biasedCoinQuestion, weight: 7 },
      { value: atLeastOneQuestion, weight: 9 },
      { value: twoDiceSumQuestion, weight: 10 },
      { value: diceConditionalQuestion, weight: 6 },
      { value: ballsWithoutReplacementQuestion, weight: 10 },
      { value: ballsWithReplacementQuestion, weight: 7 },
      { value: cardQuestion, weight: 10 },
      { value: bayesCoinQuestion, weight: 6 },
      { value: bayesTestQuestion, weight: 5 },
      { value: expectedValueQuestion, weight: 14 },
      { value: combinationsQuestion, weight: 5 }
    ]);
    return generator();
  }

  function parseNumericAnswer(input) {
    if (typeof input !== 'string' && typeof input !== 'number') return null;
    let text = String(input).trim().replace(/,/g, '').replace(/£/g, '');
    if (!text) return null;
    const percent = text.endsWith('%');
    if (percent) text = text.slice(0, -1).trim();
    let result;
    if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(text)) {
      const parts = text.split('/').map((part) => Number(part.trim()));
      if (parts[1] === 0) return null;
      result = rational(parts[0], parts[1]);
    } else if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)) {
      const sign = text.startsWith('-') ? -1 : 1;
      const unsigned = text.replace(/^[+-]/, '');
      if (unsigned.includes('.')) {
        const [whole, decimals] = unsigned.split('.');
        const den = 10 ** decimals.length;
        result = rational(sign * (Number(whole || 0) * den + Number(decimals || 0)), den);
      } else {
        result = rational(Number(text), 1);
      }
    } else return null;
    return percent ? divR(result, rational(100, 1)) : result;
  }

  function isTypedAnswerCorrect(question, input) {
    const parsed = parseNumericAnswer(input);
    if (!parsed || !question || !question.correctValue) return false;
    const candidates = [parsed];
    if (question.answerStyle === 'percent' && !String(input).includes('%')) candidates.push(divR(parsed, rational(100, 1)));
    return candidates.some((candidate) => {
      if (equalR(candidate, question.correctValue)) return true;
      const tolerance = Number(question.approximateTolerance) || 0;
      return tolerance > 0 && Math.abs(toNumber(candidate) - toNumber(question.correctValue)) <= tolerance + Number.EPSILON;
    });
  }

  function validateSequenceRule(question) {
    if (!question || !question.rule || !question.sequenceCheck) return false;
    const rule = question.rule;
    const expectedLength = question.sequenceCheck.terms.length;
    let generated = [];
    let next;
    const factorial = (n) => { let value = 1; for (let i = 2; i <= n; i += 1) value *= i; return value; };
    const triangle = (n) => n * (n + 1) / 2;
    const reverse = (n) => Number(String(n).split('').reverse().join(''));
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

    if (rule.type === 'constantDifference') {
      generated = Array.from({ length: expectedLength + 1 }, (_, i) => rule.start + i * rule.difference);
    } else if (rule.type === 'arithmeticDifferences') {
      generated = [rule.start];
      let difference = rule.firstDifference;
      while (generated.length < expectedLength + 1) {
        generated.push(generated[generated.length - 1] + difference);
        difference += rule.differenceStep;
      }
    } else if (rule.type === 'quadratic') {
      generated = Array.from({ length: expectedLength + 1 }, (_, i) => {
        const n = rule.startN + i;
        return rule.a * n ** 2 + rule.b * n + rule.c;
      });
    } else if (rule.type === 'geometric') {
      const ratioParts = String(rule.ratio).split('/').map(Number);
      const ratioNum = ratioParts.length === 2 ? ratioParts[0] : Number(rule.ratio);
      const ratioDen = ratioParts.length === 2 ? ratioParts[1] : 1;
      generated = [rule.start];
      while (generated.length < expectedLength + 1) generated.push(generated[generated.length - 1] * ratioNum / ratioDen);
    } else if (rule.type === 'alternatingAddSubtract') {
      generated = [rule.start];
      while (generated.length < expectedLength + 1) {
        const stepIndex = generated.length;
        generated.push(generated[generated.length - 1] + (stepIndex % 2 === 1 ? rule.add : -rule.subtract));
      }
    } else if (rule.type === 'interleavedArithmetic') {
      generated = Array.from({ length: expectedLength + 1 }, (_, i) => i % 2 === 0
        ? rule.oddStart + Math.floor(i / 2) * rule.oddDifference
        : rule.evenStart + Math.floor(i / 2) * rule.evenDifference);
    } else if (rule.type === 'alternatingMultiplyDivideAdjust') {
      generated = [rule.start];
      while (generated.length < expectedLength + 1) {
        const stepIndex = generated.length;
        generated.push(stepIndex % 2 === 1
          ? generated[generated.length - 1] * rule.multiply
          : generated[generated.length - 1] / rule.divide + rule.add);
      }
    } else if (rule.type === 'sumPreviousTwo') {
      generated = [rule.first, rule.second];
      while (generated.length < expectedLength + 1) generated.push(generated[generated.length - 1] + generated[generated.length - 2]);
    } else if (rule.type === 'multiplyAdd' || rule.type === 'multiplySubtract') {
      generated = [rule.start];
      const sign = rule.type === 'multiplyAdd' ? 1 : -1;
      while (generated.length < expectedLength + 1) generated.push(generated[generated.length - 1] * rule.multiplier + sign * rule.adjust);
    } else if (rule.type === 'multiplyIncreasingAdjust') {
      generated = [rule.start];
      while (generated.length < expectedLength + 1) {
        const stepIndex = generated.length - 1;
        generated.push(generated[generated.length - 1] * rule.multiplier + rule.incrementStart + stepIndex);
      }
    } else if (rule.type === 'squares') {
      generated = Array.from({ length: expectedLength + 1 }, (_, i) => (rule.start + i) ** 2);
    } else if (rule.type === 'cubes') {
      generated = Array.from({ length: expectedLength + 1 }, (_, i) => (rule.start + i) ** 3);
    } else if (rule.type === 'triangular') {
      generated = Array.from({ length: expectedLength + 1 }, (_, i) => triangle(rule.start + i));
    } else if (rule.type === 'factorials') {
      generated = Array.from({ length: expectedLength + 1 }, (_, i) => factorial(rule.start + i));
    } else if (rule.type === 'primes') {
      generated = primes.slice(rule.startIndex, rule.startIndex + expectedLength + 1);
    } else if (rule.type === 'alternateReverseAdd') {
      generated = [rule.seed];
      while (generated.length < expectedLength + 1) {
        const stepIndex = generated.length;
        generated.push(stepIndex % 2 === 1 ? reverse(generated[generated.length - 1]) : generated[generated.length - 1] + rule.increment);
      }
    } else {
      return false;
    }

    next = generated[expectedLength];
    const termsMatch = generated.slice(0, expectedLength).every((value, index) => value === question.sequenceCheck.terms[index]);
    return termsMatch && next === question.sequenceCheck.next;
  }

  function parseDisplayedAnswer(question) {
    if (!question || question.answerStyle === 'text') return null;
    let text = String(question.correctAnswer || '').replace(/−/g, '-').replace(/£/g, '');
    if (question.answerStyle === 'probability') text = text.split(' (')[0];
    return parseNumericAnswer(text);
  }

  function validateQuestion(question) {
    const errors = [];
    if (!question || typeof question !== 'object') return ['Question is not an object'];
    if (!question.id) errors.push('Missing id');
    if (!['mental', 'sequences', 'probability'].includes(question.category)) errors.push('Invalid category');
    if (!question.subtype || !question.subtypeLabel) errors.push('Missing subtype metadata');
    if (!question.prompt || typeof question.prompt !== 'string' || !question.prompt.trim()) errors.push('Empty prompt');
    if (!question.explanation || typeof question.explanation !== 'string' || !question.explanation.trim()) errors.push('Missing explanation');
    if (!question.templateId) errors.push('Missing templateId');
    if (!question.correctValue || !Number.isSafeInteger(question.correctValue.num) || !Number.isSafeInteger(question.correctValue.den) || question.correctValue.den <= 0) errors.push('Invalid correct value');
    if (!Number.isFinite(Number(question.approximateTolerance || 0)) || Number(question.approximateTolerance || 0) < 0) errors.push('Invalid approximation tolerance');
    if (!Array.isArray(question.options) || question.options.length !== 4) errors.push('Must have exactly four options');
    if (Array.isArray(question.options)) {
      if (question.options.some((option) => typeof option !== 'string' || !option.trim())) errors.push('Options must be non-empty strings');
      if (new Set(question.options).size !== question.options.length) errors.push('Duplicate options');
      const matches = question.options.filter((option) => option === question.correctAnswer).length;
      if (matches !== 1) errors.push('Correct answer must appear exactly once');
      if (!Number.isInteger(question.correctIndex) || question.options[question.correctIndex] !== question.correctAnswer) errors.push('Incorrect correctIndex');
    }

    if (question.answerStyle !== 'text' && question.correctValue && Number.isSafeInteger(question.correctValue.num) && Number.isSafeInteger(question.correctValue.den) && question.correctValue.den > 0) {
      const displayed = parseDisplayedAnswer(question);
      if (!displayed) errors.push('Displayed correct answer is not numerically parseable');
      else {
        const difference = Math.abs(toNumber(displayed) - toNumber(question.correctValue));
        const tolerance = Number(question.approximateTolerance || 0);
        if (difference > tolerance + Number.EPSILON) errors.push('Displayed correct answer does not match correct value');
      }
    }

    if (question.category === 'probability') {
      if (!question.method) errors.push('Probability method missing');
      if (!question.assumptions) errors.push('Probability assumptions missing');
      if (question.answerStyle !== 'currency' && question.templateId !== 'prob-basic-combinations') {
        const value = toNumber(question.correctValue);
        if (value < 0 || value > 1) errors.push('Probability outside [0, 1]');
        if (Array.isArray(question.options)) {
          question.options.forEach((option) => {
            const primary = String(option).split(' (')[0];
            const parsed = parseNumericAnswer(primary);
            if (!parsed || toNumber(parsed) < 0 || toNumber(parsed) > 1) errors.push('Probability option outside [0, 1]');
          });
        }
      }
    }
    if (question.category === 'sequences') {
      if (!question.sequenceCheck || !Array.isArray(question.sequenceCheck.terms)) errors.push('Sequence check missing');
      if (question.sequenceCheck) {
        if (!question.sequenceCheck.terms.every(Number.isSafeInteger) || !Number.isSafeInteger(question.sequenceCheck.next)) errors.push('Sequence values must be safe integers');
        if (String(question.sequenceCheck.next) !== question.correctAnswer) errors.push('Sequence next term mismatch');
        if (question.correctValue.num !== question.sequenceCheck.next || question.correctValue.den !== 1) errors.push('Sequence correct value mismatch');
        if (!question.explanation.includes(String(question.sequenceCheck.next))) errors.push('Sequence explanation omits next term');
      }
      if (!question.rule || !question.patternFamily) errors.push('Sequence rule metadata missing');
      if (question.rule && question.sequenceCheck && !validateSequenceRule(question)) errors.push('Sequence terms do not match stored rule');
      if (question.rule && question.rule.type === 'alternatingAddSubtract' && !question.explanation.includes(`subtract ${question.rule.subtract}`)) errors.push('Alternating-sequence explanation states the wrong operation');
    }
    return errors;
  }

  function generateUniqueSet(generator, count) {
    const questions = [];
    const prompts = new Set();
    let attempts = 0;
    while (questions.length < count && attempts < count * 300) {
      attempts += 1;
      try {
        const question = generator();
        const errors = validateQuestion(question);
        const key = questionUniquenessKey(question);
        if (!errors.length && !prompts.has(key)) {
          prompts.add(key);
          questions.push(question);
        }
      } catch (_) { /* regenerate */ }
    }
    if (questions.length !== count) throw new Error(`Could not generate ${count} unique valid questions.`);
    return questions;
  }

  function generateBalancedSet(blueprint) {
    const questions = [];
    const prompts = new Set();
    blueprint.forEach(({ generator, count }) => {
      let generated = 0;
      let attempts = 0;
      while (generated < count && attempts < count * 400) {
        attempts += 1;
        try {
          const question = generator();
          const key = questionUniquenessKey(question);
          if (!validateQuestion(question).length && !prompts.has(key)) {
            prompts.add(key);
            questions.push(question);
            generated += 1;
          }
        } catch (_) { /* regenerate */ }
      }
      if (generated !== count) throw new Error(`Could not generate ${count} unique questions for a required subtype.`);
    });
    return shuffle(questions);
  }

  function generateTimedSet(drillType) {
    const drill = DRILLS[drillType];
    if (!drill) throw new Error('Unknown drill type');
    if (drillType === 'mental') {
      return generateBalancedSet([
        { generator: additionSubtractionQuestion, count: 16 },
        { generator: multiplicationQuestion, count: 16 },
        { generator: divisionQuestion, count: 12 },
        { generator: fractionDecimalQuestion, count: 16 },
        { generator: percentageQuestion, count: 12 },
        { generator: missingNumberQuestion, count: 8 }
      ]);
    }
    if (drillType === 'sequences') {
      return generateBalancedSet([
        { generator: firstDifferencesSequence, count: 6 },
        { generator: ratioSequence, count: 3 },
        { generator: alternatingSequence, count: 4 },
        { generator: recurrenceSequence, count: 4 },
        { generator: familiarFamilySequence, count: 2 },
        { generator: digitSequence, count: 1 }
      ]);
    }
    return generateUniqueSet(generateProbabilityQuestion, drill.count);
  }

  function generatePracticeQuestion(category) {
    const selected = category || choice(['mental', 'sequences', 'probability']);
    const generator = selected === 'mental' ? generateMentalQuestion : selected === 'sequences' ? generateSequenceQuestion : generateProbabilityQuestion;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      try {
        const question = generator();
        if (!validateQuestion(question).length) return question;
      } catch (_) { /* regenerate */ }
    }
    throw new Error('Could not generate a valid practice question.');
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function scoreResults(results, drillType) {
    const drill = DRILLS[drillType];
    if (!drill) throw new Error('Unknown drill type');
    const score = results.reduce((total, result) => total + (result.status === 'correct' ? drill.correct : result.status === 'incorrect' ? drill.incorrect : 0), 0);
    return Number(score.toFixed(12));
  }

  function remainingMs(endTimestamp, nowTimestamp) {
    return Math.max(0, endTimestamp - nowTimestamp);
  }

  function elapsedMs(startTimestamp, nowTimestamp) {
    return Math.max(0, nowTimestamp - startTimestamp);
  }

  function createSubmissionGate() {
    let locked = false;
    let ended = false;
    return {
      tryAcquire() {
        if (locked || ended) return false;
        locked = true;
        return true;
      },
      release() { if (!ended) locked = false; },
      end() { ended = true; locked = true; },
      isLocked() { return locked; },
      isEnded() { return ended; }
    };
  }

  function validateGenerators(iterations) {
    const count = Math.max(1000, Math.floor(iterations || 1000));
    const report = { iterationsPerMajorGenerator: count, mental: [], sequences: [], probability: [], utilities: [], totalErrors: 0 };
    const suites = [
      ['mental', generateMentalQuestion],
      ['sequences', generateSequenceQuestion],
      ['probability', generateProbabilityQuestion]
    ];
    suites.forEach(([name, generator]) => {
      for (let i = 0; i < count; i += 1) {
        try {
          const errors = validateQuestion(generator());
          if (errors.length) report[name].push({ iteration: i, errors });
        } catch (error) {
          report[name].push({ iteration: i, errors: [error.message] });
        }
      }
    });

    const mentalScore = scoreResults([{ status: 'correct' }, { status: 'incorrect' }, { status: 'skipped' }], 'mental');
    if (mentalScore !== 0) report.utilities.push('Mental negative marking failed');
    const sequenceScore = scoreResults([{ status: 'correct' }, { status: 'incorrect' }, { status: 'incorrect' }, { status: 'incorrect' }], 'sequences');
    if (Math.abs(sequenceScore) > 1e-12) report.utilities.push('One-third negative marking failed');
    if (median([1, 3, 2]) !== 2 || median([1, 4, 2, 3]) !== 2.5) report.utilities.push('Median calculation failed');
    if (remainingMs(5000, 4200) !== 800 || remainingMs(5000, 6000) !== 0 || elapsedMs(1000, 1750) !== 750) report.utilities.push('Timestamp timer calculations failed');
    const gate = createSubmissionGate();
    if (!gate.tryAcquire() || gate.tryAcquire()) report.utilities.push('Duplicate-submission protection failed');
    gate.release();
    if (!gate.tryAcquire()) report.utilities.push('Submission gate release failed');
    gate.end();
    if (gate.tryAcquire()) report.utilities.push('Submission after end was not blocked');
    if (!isTypedAnswerCorrect({ correctValue: rational(1, 2), answerStyle: 'fraction' }, '50%')) report.utilities.push('Equivalent typed percentage failed');
    if (!isTypedAnswerCorrect({ correctValue: rational(1, 2), answerStyle: 'fraction' }, '0.5')) report.utilities.push('Equivalent typed decimal failed');
    if (!isTypedAnswerCorrect({ correctValue: rational(1, 2), answerStyle: 'fraction' }, '2/4')) report.utilities.push('Equivalent typed fraction failed');
    if (!isTypedAnswerCorrect({ correctValue: rational(1, 3), answerStyle: 'decimal', approximateTolerance: 0.0005 }, '0.333')) report.utilities.push('Explicit decimal approximation failed');
    if (!isTypedAnswerCorrect({ correctValue: rational(1, 6), answerStyle: 'percent', approximateTolerance: 0.00005 }, '16.67%')) report.utilities.push('Explicit percentage approximation failed');

    try { rational(1.5, 1); report.utilities.push('Non-integer rational input was not rejected'); } catch (_) { /* expected */ }
    if (!equalR(addR(rational(1, 3), rational(1, 6)), rational(1, 2))) report.utilities.push('Fraction addition failed');
    if (!equalR(subR(rational(3, 4), rational(2, 3)), rational(1, 12))) report.utilities.push('Fraction subtraction failed');
    if (!equalR(mulR(rational(5, 8), rational(4, 15)), rational(1, 6))) report.utilities.push('Fraction multiplication failed');
    if (!equalR(divR(rational(7, 9), rational(14, 15)), rational(5, 6))) report.utilities.push('Fraction division failed');
    if (!equalR(mulR(rational(15, 100), rational(340, 1)), rational(51, 1))) report.utilities.push('Percentage-of-number calculation failed');
    if (!equalR(mulR(rational(80, 100), rational(120, 100)), rational(24, 25))) report.utilities.push('Consecutive percentage calculation failed');
    if (!equalR(subR(rational(3, 10), rational(4, 10)), rational(-1, 10))) report.utilities.push('Expected-value subtraction failed');

    const mentalSet = generateTimedSet('mental');
    const sequenceSet = generateTimedSet('sequences');
    const probabilitySet = generateTimedSet('probability');
    const expectedCounts = {
      mental: { addsub: 16, multiplication: 16, division: 12, fractions: 16, percentages: 12, missing: 8 },
      sequences: { differences: 6, ratios: 3, alternating: 4, recurrences: 4, families: 2, digits: 1 }
    };
    [[mentalSet, 'mental'], [sequenceSet, 'sequences'], [probabilitySet, 'probability']].forEach(([set, type]) => {
      if (set.length !== DRILLS[type].count) report.utilities.push(`${type} timed-set count failed`);
      if (new Set(set.map((question) => question.prompt.replace(/\s+/g, ' ').trim().toLowerCase())).size !== set.length) report.utilities.push(`${type} timed set contains duplicate prompts`);
      set.forEach((question) => {
        const errors = validateQuestion(question);
        if (errors.length) report.utilities.push(`${type} timed set contains an invalid question: ${errors.join(', ')}`);
      });
      if (expectedCounts[type]) {
        const actual = set.reduce((map, question) => { map[question.subtype] = (map[question.subtype] || 0) + 1; return map; }, {});
        Object.entries(expectedCounts[type]).forEach(([subtype, expected]) => {
          if (actual[subtype] !== expected) report.utilities.push(`${type} subtype distribution failed for ${subtype}`);
        });
      }
    });
    mentalSet.filter((question) => question.subtype === 'division').forEach((question) => {
      const match = question.prompt.match(/^(-?\d+(?:\.\d+)?) ÷ (-?\d+(?:\.\d+)?)$/);
      if (!match || Math.abs(Number(match[1]) / Number(match[2]) - toNumber(question.correctValue)) > 1e-12) report.utilities.push('Exact division validation failed');
    });

    report.totalErrors = report.mental.length + report.sequences.length + report.probability.length + report.utilities.length;
    if (report.totalErrors === 0) console.info(`Quant OA Trainer validation passed: ${count} questions from each major generator.`);
    else console.error('Quant OA Trainer validation found problems.', report);
    return report;
  }

  window.QuantQuestions = {
    DRILLS,
    MENTAL_SUBTYPES,
    SEQUENCE_SUBTYPES,
    PROBABILITY_SUBTYPES,
    generateMentalQuestion,
    generateSequenceQuestion,
    generateProbabilityQuestion,
    generateTimedSet,
    generatePracticeQuestion,
    parseNumericAnswer,
    isTypedAnswerCorrect,
    validateQuestion,
    validateSequenceRule,
    validateGenerators,
    median,
    scoreResults,
    remainingMs,
    elapsedMs,
    createSubmissionGate,
    rational,
    formatRational
  };
}());
