# Quant OA Trainer

Quant OA Trainer is a static browser-based application for practising mental math, numerical sequences, probability, and expected value under time pressure. It is designed as a focused personal training tool rather than a course, commercial platform, or imitation of any named firm's current assessment.

The application uses plain HTML, CSS, vanilla JavaScript, and browser `localStorage`. There is no backend, account system, external API, package manager, build process, analytics service, or runtime AI generation.

## Main modes

- **80 in 8 Mental Math** — 80 multiple-choice questions in 8 minutes, scored +1 correct and −1 incorrect.
- **Timed Sequences** — 20 procedural sequence questions in 10 minutes, scored +1 correct and −1/3 incorrect.
- **Timed Probability & EV** — 15 structured probability and expected-value questions in 15 minutes, scored +1 correct and −1/3 incorrect.
- **Untimed Mixed Practice** — unlimited practice drawn equally from the three major categories, with immediate feedback and no score.

## Features

- Procedural question generation with validation before display
- Four-option multiple choice in every timed drill
- Typed mental-math answers in untimed practice
- Keyboard-first timed controls: `1`–`4` to answer and `Escape` to skip
- Timestamp-based overall countdown and per-question stopwatch
- Delayed feedback for timed drills and immediate feedback for practice
- Drill-specific negative marking
- Accuracy and completion-rate calculations
- Average and median response times
- Internal subtype performance tables
- Mistake review and full-question review
- Recent attempts, latest scores, and best scores
- Local attempt history stored in `localStorage`
- JSON history export
- Responsive desktop and mobile layout
- Development validation available in the browser console

## Run locally

No installation or build step is required.

Download or clone the repository and open `index.html` in a modern browser.

```bash
git clone REPOSITORY_URL
cd quant-oa-trainer
```

Then open `index.html` directly. The application uses ordinary deferred script tags rather than module imports, so it works from the local filesystem.

## Development validation

Open the browser developer console and run:

```javascript
QuantQuestions.validateGenerators(1000)
```

This generates at least 1,000 questions from each major generator and checks question structure, mathematical values, distractor uniqueness, sequence metadata, probability bounds, negative marking, median calculations, timestamp timer calculations, equivalent typed answers, and duplicate-submission protection.


## Push to GitHub

```bash
git init
git add .
git commit -m "Initial Quant OA Trainer release"
git branch -M main
git remote add origin REPOSITORY_URL
git push -u origin main
```

Replace `REPOSITORY_URL` with the URL of the repository you create on GitHub.

## GitHub Pages deployment

1. Push the repository to GitHub.
2. Open the repository's **Settings**.
3. Open **Pages**.
4. Select deployment from a branch.
5. Select the `main` branch.
6. Select the repository root.
7. Save.
8. Open the generated GitHub Pages URL.

The same static files can also be hosted on another service that serves ordinary HTML, CSS, and JavaScript files.

## Privacy

- Timed attempt data is stored in browser `localStorage`.
- Nothing is transmitted by the application.
- No account is required.
- Clearing browser data may erase saved history.
- Exported JSON files remain on the user's device unless the user moves or uploads them elsewhere.

## Disclaimer

Independent practice tool. Not affiliated with or endorsed by any quantitative trading firm or assessment provider.

## Licence

MIT. See [LICENSE](LICENSE).
