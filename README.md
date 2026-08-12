# Quant OA Trainer

Quant OA Trainer is a browser-based tool for practising mental math, numerical sequences, probability, and expected value under time pressure.

It is intended as a personal training tool rather than a course, commercial platform, or copy of any particular firm's current assessment.

Live Demo: **[Open Quant OA Trainer](https://williamtdavies.github.io/quant-oa-trainer/)**

## Main modes

* **80 in 8 Mental Math** — 80 multiple-choice questions in 8 minutes. +1 for correct, −1 for incorrect.
* **Timed Sequences** — 20 sequence questions in 10 minutes. +1 for correct, −1 for incorrect.
* **Timed Probability & EV** — 15 probability and expected-value questions in 15 minutes. +1 for correct, −1 for incorrect.
* **Untimed Mixed Practice** — unlimited practice across the three main categories, with immediate feedback and no score.

## Features

* Procedurally generated questions with validation
* Four-option multiple choice for timed drills
* Typed answers for untimed mental-math practice
* Keyboard controls (`1`–`4` to answer multiple-choice questions, `Enter` to continue after practice feedback, and `Escape` to skip timed questions)
* Overall countdown and per-question timing
* Delayed feedback during timed drills
* Immediate feedback during practice
* Negative marking
* Accuracy and completion statistics
* Average and median response times
* Performance breakdown by question subtype
* Mistake and full-question review
* Recent, latest, and best scores
* Attempt history stored in `localStorage`
* JSON history export
* Responsive layout
* Browser-console validation tools for development

## Running locally

There is no installation or build step.

Clone the repository:

```bash
git clone REPOSITORY_URL
cd quant-oa-trainer
```

Then open `index.html` in a modern browser.

The app uses regular deferred script tags rather than JavaScript modules, so it can be run directly from the filesystem.

## Tech

The app is deliberately simple:

* HTML
* CSS
* Vanilla JavaScript
* Browser `localStorage`

There is no backend, account system, external API, package manager, build process, analytics service, or runtime AI generation.

## Privacy

Attempt history is stored in the browser's `localStorage`.

The application does not send attempt data to a backend and does not require an account. Clearing browser data may remove saved history.

Exported JSON files stay on the user's device unless they are moved or uploaded elsewhere.

## Disclaimer

Independent practice tool. Not affiliated with or endorsed by any quantitative trading firm or assessment provider.

## Licence

MIT. See [LICENSE](LICENSE).
