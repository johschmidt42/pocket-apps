# Decisions

Short records of why we chose a tool or a pattern. Newest first.
Read the related entry before you change a decision. Add an entry for each new decision.

## 2026-11-14: Vertical timeline drawn as own SVG, not with Recharts (zeitstrahl)

- **Context:** `zeitstrahl` shows moments (points) and time ranges on vertical timelines, for example a CV or the appointments at a doctor. Time goes from top to bottom. A line is in the middle. Each entry is left or right of the line. The user picks the side per entry (field "Seite"). The default "Automatisch" takes the other side of the entry before it. Two views: real distances, or long empty gaps cut short ("Lücken kürzen"). A gap is long if it is more than 10 % of the whole time. A cut gap is 48 px high: a dotted part of the trunk, with the real length as a chip ("6 Jahre").
- **Decision:** The app draws the timeline as its own SVG (`timeline-chart.tsx`). The calculations are pure functions in `layout.ts`: the scale with its cut gaps, the ticks, and the positions of the cards. This is an exception to "charts use Recharts" (2026-11-10: Charts with Recharts).
- **Why:** Recharts has no axis in the middle of a chart and no broken axis (an axis with cut gaps). With Recharts, the app would use only `ResponsiveContainer` (it measures the size). All marks and the axis would be own code anyway, and Recharts would add about 155 KB (gzip) to the app file.
- **Decision:** The SVG uses percent values for the horizontal positions (`x="50%"`). A nested `<svg x="50%">` puts the origin on the center line. Thus the code gives all positions as SVG attributes and needs no inline `style`. Each entry has a card: HTML in a `<foreignObject>`, a `<button>` with Tailwind classes. A card with a description shows a `Tooltip` from `packages/ui` with it. A click on a card opens the dialog "Eintrag bearbeiten".
- **Decision (look):** The look follows popular timeline examples (Cruip "Progress Timeline" with Tailwind, shadcn timeline blocks, Linear and Notion): white cards with a thin border and a soft shadow on a light gray area, and a small rounded label ("chip") on the line for each tick (years or months: the app takes the smallest step that keeps the chips at least 56 px apart). "Heute" and each cut gap are chips on the line. While the mouse is on a card, the other entries fade.
- **Decision:** The app has no list of entries. The cards show the title, the date and, for a range, its length ("5 Jahre"). A click on a card opens the dialog "Eintrag bearbeiten". An eye button on each card hides the entry: the data file sets the field `visible` of the entry to `false`. Hidden entries are not on the timeline, and the scale ignores them. If there are hidden entries, the toggle button "Ausgeblendete zeigen (2)" (with the number of hidden entries) appears above the timeline. When it is on, the timeline also shows the hidden entries, with faded cards and dashed lines, and the scale includes them. Their eye button shows them again. While the toggle is on, an entry that the user hides stays on the timeline as a faded card. When the last hidden entry comes back, the toggle goes off. The data file does not keep the toggle: after a reload, it is off. An earlier version had one chip per entry above the timeline. We removed it: it repeated the cards, and the user wanted the control on the entries. The button "Neuer Eintrag" above the timeline adds an entry. The dialog "Eintrag bearbeiten" removes an entry. A row of toggle buttons ("pills") above selects the timeline, not a select box.
- **Decision (trunk):** The user wanted a thick line in the middle of the timeline, with the entries growing from it like branches. The line is a trunk: a rounded bar, 18 px wide, in `--muted-foreground` at 30 % opacity. For each entry, a branch grows from the side of the trunk that the entry is on to the card. A branch is a filled shape between two curves from the edge of the trunk to the inner edge of the card, in the color of its side (`--chart-1` left, `--chart-2` right). At the trunk, the branch of a range goes from the position of its start to the position of its end on the time scale (at least 10 px). Thus a long range has a wide branch, like a fan. The branch of a point is 10 px wide at the trunk and has a ring (6 px radius) on the edge of the trunk. At the card, each branch is 3 px wide. Overlapping ranges on one side have overlapping branches. The fill is light (35 % opacity) and the outline is strong (80 %). Thus each branch stays visible. An earlier version had thin lines and a colored bar per range next to the line, in up to 3 lanes. The user found the bars out of place.
- **Decision:** The SVG draws the branches first, then the trunk with its chips, then the rings. A year chip that a ring would cover (nearer than 15 px) is left out. A point with year precision is always on a year chip, so this happens often.
- **Decision (leaves):** A card is a leaf at the end of its branch. It has a leaf shape: two opposite corners are round (20 px), the other two are small (6 px). On a card right of the trunk, the top left and the bottom right corners are round. On a card left of the trunk, the top right and the bottom left corners are round. The card has a light tint of the side color (`--chart-1` left, `--chart-2` right, at 8 % opacity) on its full area, and a border in the side color (30 %, 60 % while the mouse is on the card). It shows the title in bold and one gray line with the time and the length: "10/2018 – 09/2021 · 3 Jahre". A small, light icon (`MessageSquareText` from lucide) after the title tells that the entry has a description. The eye button that hides the entry shows only while the mouse is on the card or the keyboard focus is in it. This applies only to a device with a mouse or a touchpad (the Tailwind variant `pointer-fine`). On a touch screen, it always shows, because there is no mouse. On a hidden card (dashed border, faded), the eye button always shows: there, showing the entry again is the main action. Earlier versions had a colored stripe in the card, a tint that faded out in the middle of the card, the date as a chip in the card, and an eye button on each card. The user found this not calm and the eye button not clear: a crossed-out eye on a visible entry looks like a state, not like an action.
- **Decision (description):** The description shows in a bubble at the outer side of its card (left of a card on the left, right of a card on the right). When the bubble opens, `bubblePlace()` measures the space between the card and the edge of the window. It takes the widest bubble width that fits there completely: 320, 240 or 200 px. The space must also hold 22 px for the stem and a margin, on top of the bubble width. If not even 200 px fit, the bubble goes above the card with 320 px (below it, if there is no space above). The bubble must fit with its full width before it opens. If it does not fit, Radix moves it to the opposite side of the card (the inner side, over the trunk). Radix makes a bubble narrower only after this move, so a narrower maximum width from Radix does not help. The bubble has the leaf shape and a border in the color of the side. A stem connects bubble and card, in the style of the branches (the color of the side, light fill, strong outline): 8 px wide at the card, 2 px wide at the bubble. The stem is vertical above or below the card and horizontal at its side. The bubble opens when the mouse is on the card or when the card has the keyboard focus. The bubble is the `Tooltip` of `packages/ui` with own classes: it hides the arrow of the tooltip, because the stem replaces it. The app never chooses the inner side: there the bubble would cover the trunk. Because the app chooses a width that fits, Radix never moves the bubble there. The user asked for the bubble at the side, not above. The bubble has nothing to click, so it has `pointer-events-none`. The app decides when a bubble is open, not Radix (`useActiveCard()` in `use-active-card.ts`). The hook listens to each mouse move in the document and asks which card is under the mouse. Radix puts each bubble into a box (`div[data-radix-popper-content-wrapper]`). The class `pointer-events-none` reaches only the bubble in it, so this box still takes the mouse. If the mouse is on this box, `document.elementsFromPoint()` gives the card below the bubble. During a scroll, no card is active. At the end of a scroll (`scrollend`), the card under the resting mouse becomes active. Escape closes the bubble of the active card (the card under the mouse or with the keyboard focus). A click on the card also closes it, because the click opens the dialog "Eintrag bearbeiten". Each card keeps the place (side and width) of its bubble, also after it is no longer the active card. In an earlier version, the hook had one place for all cards: when the mouse left a card, the place went back to "above", and the bubble jumped above the card during its fade-out animation (about 150 ms). The keyboard focus in a card also opens its bubble. Before, Radix and each card used the `pointerenter` and `pointerleave` events of the card. A Playwright script (not in the repository) made 300 random mouse moves over the timeline. After each stop, it checked that the open bubble belonged to the card under the mouse. With the old way, sometimes such an event got lost: then no bubble opened, or a wrong card stayed active (up to 7 of 96 stops). With the new hook, the script found no error at the window widths 380, 1000, 1300 and 1440 px. In an earlier version, a card also moved up by 2 px on hover. Then a mouse at its bottom edge was suddenly outside the card, and the card lost the hover. Now a card does not move on hover. A card that opens the dialog "Eintrag bearbeiten" shows the hand cursor (`cursor-pointer`).
- **Decision (dates on the trunk):** While a card is active (the mouse is on the card or on its branch, or the card has the keyboard focus), date chips on the trunk show where its branch touches the trunk: the start and the end of a range, or the date of a point (a moment). An ongoing range has only its start, because "Heute" is its end. If the two chips of a range would be nearer than 22 px on the trunk (from center to center), one chip in the middle of the range shows the whole range, for example "02/2016 – 07/2016". The chips sit in the middle of the trunk, like the year chips, with a border in the color of the branch. Year chips nearer than 20 px are left out while the date chips show. The date chips let the mouse through. The cards already show their dates, but the year chips are too coarse to show where a range starts and ends on the trunk. A second bubble with the dates was rejected: it would repeat the card. A branch and the ring of a point have the attribute `data-branch-of` with the ID of their entry. Thus `useActiveCard()` finds the card of a branch, and the mouse on a branch works like the mouse on its card.
- **Decision (description format):** A description has a small own format with three rules: a line that starts with `-`, `*`, `•` or `·` and a space is a list item; `**text**` is bold; an empty line starts a new paragraph. A single line break inside a paragraph stays a line break. Other text stays as it is, also a single `*` and an unclosed `**`. `description.ts` parses the text into paragraphs and lists, and `description-text.tsx` renders them as React elements, never as HTML. Thus a description cannot inject code. The dialog shows the rules under the field. Rejected: full Markdown (headings, tables and links are too much for a short description, a link in a hover bubble is hard to click, and it needs a library), and a format that guesses (for example "the first line is a heading"), because a wrong guess looks broken.
- **Decision (trunk color):** A click on the trunk gives it the next color: gray (the default, `--muted-foreground` at 30 % opacity), green (`--chart-3`), purple (`--chart-7`), pink (`--chart-5`), yellow (`--chart-4`), red (`--chart-8`), then gray again. The colors have 55 % opacity. `--chart-6` is not used: it is too near to `--chart-3`. The data file keeps the color per timeline in the field `trunk`, with the values `gray`, `green`, `purple`, `pink`, `yellow` and `red`. Schema version 1 was not published yet, so the field needs no migration. The trunk is not a category, but `AGENTS.md` allows no new colors, and `--chart-1` and `--chart-2` are the sides. To make the trunk clickable, a transparent `<button>` in a `<foreignObject>` lies on the trunk. Its `aria-label` tells the current color. Each card is in an invisible box (a `foreignObject`) that reaches to the middle of the trunk. The visible card stops 64 px before the trunk. Thus the `foreignObject` elements have `pointer-events-none`, and only the cards in them take pointer events. Else a click on the trunk worked only between the cards.
- **Decision:** Cards on one side that would overlap move apart vertically as a group (60 px per card, 10 px space). The group is centered on the mean of their start dates. The branch of a moved card bends more.
- **Decision (example):** A new data file has one empty timeline, "Mein Zeitstrahl". While no timeline has an entry, the app shows an example CV with a short notice. The example is a constant in `example.ts`, not data in the file. Its cards have no click and no eye button, but they show their descriptions. The first own entry replaces the example. An empty timeline next to timelines with entries shows only the text "Noch keine Einträge".
- **Decision:** Below a width of 600 px, the timeline has one column: the line on the left, all cards right of it. Two columns at a width of 480 px give each card less width than one column at 320 px. Thus the limit is 600 px, not 480 px. The line has at least 90 px per entry, at least 400 px and normally at most 1600 px. But it is always long enough for the cards of the side with the most cards (70 px per card). This rule wins over the 1600 px. Else, in one column with 30 entries, the last cards are hundreds of pixels below their marks. A `ResizeObserver` measures the width. The color still shows the side that the entry has in two columns (`--chart-1` left, `--chart-2` right). Thus a user can use the sides as two categories, for example "Ausbildung" and "Beruf".
- **Decision:** An entry has a precision: day (`"2026-11-14"`), month (`"2026-11"`) or year (`"2026"`). The data file stores the date as this text. The precision comes from the form of the text. A range includes its last day, month or year: "2015 – 2020" ends on 2021-01-01. If both ends of a range are days of the same year, the card shows the year only once: "01.02. – 03.03.2026". With this short form, the date of such a range fits into a card at a window width of 320 px.
- **Decision:** `fixkosten` and `zeitstrahl` both need a dialog for the name of a new item (a profile, a timeline) and `isOneOf()`. Both moved to `packages/core` (`NameDialog` in `name-dialog.tsx`, `isOneOf` in `one-of.ts`). `fixkosten` looks and works the same, so its version did not change.
- **Rejected:** The rules in `AGENTS.md` forbid CSS files in apps and inline `style`, and need the theme variables for dark mode. vis-timeline (fits well, but changes the DOM itself, needs its own CSS file and moment, about 122 KB gzip, and its React wrappers are from 2020). react-calendar-timeline (only beta versions, own CSS). react-chrono, vertical-timeline-component-react and the shadcn timelines of ReUI (even steps, no real time scale). dnd-timeline (gives positions as inline `style`). timelines-chart (d3, no theme). d3fc-discontinuous-scale (a scale with gaps, but our scale is about 30 lines). SVAR, Mobiscroll, DayPilot, TimelineJS (other design systems, commercial, or slide shows).
- **Cost:** The app file is about 556 KB (165 KB with gzip). That is about 75 KB more than `countdown` (a stateful app without charts), because of the tooltip, the toggle group and the select box. `fixkosten` with Recharts is about 970 KB (281 KB with gzip).

## 2026-11-10: School holidays from OpenHolidays, calendar with react-day-picker (schuljahr)

- **Context:** `schuljahr` shows a school year of one German state: the school holidays, the public holidays and the school days. It also counts, for example, the school days until the next holidays.
- **Decision:** The data comes from the OpenHolidays API (`openholidaysapi.org`). The API needs no key and allows requests from all web addresses (CORS `*`). The data has the license ODbL. Thus the app shows the source and the license under the calendar.
- **Decision:** The app loads a school year only when the user selects it for the first time. The button "Neu laden" loads the shown school year again (only this one). The app stores the result in the data file. At the start, it reads the data file and sends no request. Thus the app also works without internet for all stored school years.
- **Decision:** A school year goes from August 1 to July 31 (as the Kultusministerkonferenz, KMK, defines it). The app loads the data until September 30 after the school year. In Bayern, the summer holidays at the end of a school year start in August, after July 31 (2027: August 2 to September 13). With the extra two months, the app has these summer holidays complete, and it can count the school days until they start.
- **Decision:** The app shows the dates of the general schools (allgemeinbildende Schulen) in the whole state. `parseHolidays()` keeps an entry only if all three rules are true:
  - The entry is for all of Germany (`nationwide`), or its `subdivisions` contain the code of the state (`DE-BY`). An entry only for a city (Augsburg: `DE-BY-AU`) fails.
  - The field `tags` does not contain `Exception`. OpenHolidays uses this tag for a part of a state, for example the North Sea islands in Schleswig-Holstein.
  - The entry has no `groups`, or one group code ends with `-ABS` (general schools). An entry only for the vocational schools (`DE-MV-BBS`) fails. In 2026, only Mecklenburg-Vorpommern has groups.
- **Decision:** School days are Monday to Friday, without school holidays and without public holidays. OpenHolidays does not know the movable free days (bewegliche Ferientage) that each school sets itself (for example in NRW). The app says this under the calendar.
- **Decision:** The calendar is `DayPicker` from react-day-picker 10. `packages/ui/src/day-picker.ts` exports it, like `charts.ts` exports Recharts. ESLint forbids a direct import of `react-day-picker` in apps. The app gives all styles as Tailwind classes (`classNames`). It does not use the CSS file of react-day-picker.
- **Why:** The shadcn component `calendar` uses react-day-picker too. But its code does not pass our typecheck: it passes `locale`, which can be `undefined`, to a prop that does not allow `undefined` (`exactOptionalPropertyTypes`). We do not change vendor code. `DayPicker` gives the grid of the months, German names, Monday as the first day and labels for screen readers. Each day has a label with its holidays, for example "Mittwoch, 18. November 2026, Buß- und Bettag".
- **Decision:** The calendar shows only the months from the first to the last school day of the selected state. Example: in Bayern, school starts in mid-September. Thus the calendar starts with September. In a state where school starts in August, it starts with August. The totals (for example "185 Schultage" and "93 Ferientage") still count the whole school year from August 1 to July 31.
- **Decision:** A coloured day shows a tooltip with all its holidays, for example "Weihnachtsferien, Feiertag: 1. Weihnachtsfeiertag". The app replaces the `Day` component of DayPicker. DayPicker gives this component only the date and its modifiers (flags of DayPicker such as "today" or "hidden"), no other props. Thus `year-calendar.tsx` gives the tooltip texts (a map from the date to the text) to the cells through a React context. A module-level variable is no alternative: when the user selects another school year, the cells would not render again.
- **Decision:** The context also gives the cells a hover handler (mouse enter and leave). While the mouse is on a coloured day, the calendar puts a frame around all days of the holiday that gives the day its color (a public holiday wins over school holidays). The list gives the entry of this holiday a gray background. The list does not scroll. The same happens the other way: the mouse on a list entry frames its days in the calendar. The cursor stays the arrow, not the hand: the hand means "click here", but a click on a day does nothing.
- **Decision:** `fetchJson` moved from `kursverlauf` to `@pocket-apps/core/fetch-json`, because two apps use it now. ESLint forbids this import in apps with `"network": false`, like `fetch`.
- **Cost:** The app file is about 530 KB (156 KB with gzip). That is about 50 KB more than `countdown`, a stateful app without a calendar.
- **Rejected:** ferien-api.de (refused each request with HTTP 429 "Too Many Requests" in a manual test with curl). mehr-schulferien.de (the Buß- und Bettag in Bayern is missing). FullCalendar (own CSS files and a large bundle). react-yearly-calendar (old, own CSS). HeroUI, SVAR, Syncfusion (other design systems).

## 2026-11-10: 3D graphics with three.js (attraktor)

- **Context:** `attraktor` shows a strange attractor: a chaotic system of formulas. Points follow the formulas, and their trails are glowing 3D lines that move slowly. The mouse pulls on the lines. The first attractor (Aizawa) copies the start page of zensical.org.
- **Decision:** The app draws with three.js 0.187 (WebGL 2, the 3D graphics interface of the browser). three.js is a dependency of the app, not of `packages/ui`, because it is a graphics library and not a component library. If a second app needs it, move the shared code into a package.
- **Why:** zensical.org uses three.js for this picture: 225 lines with 192 to 384 points each (about 65,000 points), additive blending (the colors of lines that cross add up) and a glow effect after the render (`UnrealBloomPass`). three.js gives all of this.
- **Cost:** The app file is about 914 KB (246 KB compressed with gzip). three.js adds about 150 KB of it. Other apps do not get it.
- **Decision:** The picture is always dark, also in light mode. Added light needs a dark background. The line colors are hex values in `palettes.ts`, not theme variables, because WebGL cannot read CSS variables. The small color bars of the color choice (`palette-swatch.tsx`, SVG) use the same hex values, so that they show the colors of the picture.
- **Decision:** The simulation and the mouse effects (the mouse bends the picture, pulls on the points, or pulls the lines like rubber) are plain TypeScript in `simulation.ts`, `mouse-effects.ts` and `attractor-scene.ts`. They run on the CPU. three.js only draws (`webgl-view.ts`). Thus unit tests cover all logic.
- **Decision:** The unit tests run in jsdom, which has no WebGL. Thus `webgl-view.test.ts` replaces two three.js parts with fakes (`vi.mock`): the WebGL renderer and the chain of effects after the render (glow, colors). The camera, the mouse ray (the line from the camera through the mouse pointer) and the line geometry are the real three.js classes. For the same reason, `App` has the optional prop `viewFactory`. Only the tests use it: they give a view that records the calls and draws nothing. All other code (scene, simulation, mouse, React) runs as in the browser.
- **Decision:** `e2e/attraktor.spec.ts` starts Chromium with the flags `--use-angle=swiftshader --enable-unsafe-swiftshader`. CI computers have no graphics card. With these flags, Chromium calculates WebGL in software (SwiftShader).
- **Decision:** Two round icon buttons with a tooltip sit in the bottom right corner of the picture: "Zurücksetzen" and "Vollbild". "Vollbild" uses the Fullscreen API of the browser. In the full screen, the same button ("Vollbild beenden") and the Esc key end it. Without the Fullscreen API (for example on an iPhone), this button is not there.
- **Decision:** The whole page goes into full screen (`document.documentElement`), and the picture covers it (`fixed inset-0`). The tooltips of `packages/ui` show in an element at the end of `<body>`. With only the picture in full screen, the browser does not show them. jsdom has no Fullscreen API. Thus `app.test.tsx` adds a small copy of it, as the tests do for `getBoundingClientRect`.
- **Detail:** The values of Aizawa come from the page code of zensical.org. The formula has 6 parameters (α to ζ). The page moves them slowly between 5 sets of values ("profiles"), one move every 3 to 6 minutes. The app does the same. In the term `1 + ε·z` of the standard Aizawa formula, zensical.org uses ε/4. The app does the same, so that the shape is the same.
- **Rejected:** Canvas 2D (no glow without a lot of extra code, slow with 65,000 points). Plain WebGL without a library (then we must write the glow and the line buffers ourselves).

## 2026-11-10: UI style Maia with the base color stone

- **Decision:** The shadcn components use the style `radix-maia` instead of `radix-nova`. Buttons and inputs are round ("pills"). Cards and dialogs have larger corners and more space inside.
- **Decision:** The theme uses the base color `stone` instead of `neutral`. The grays are a little warm. The radius is `0.75rem`. The chart colors did not change.
- **Why:** The user did not like the look of Nova. The user compared Maia locally and chose it.
- **How:** `packages/ui/components.json` has the new style. `pnpm shadcn add <all components> --overwrite` generated the components again. The colors in `globals.css` are the stone values of shadcn. After the command, check the versions in `packages/ui/package.json`: the command set Recharts back to 3.8.0, so we pinned 3.10.1 again.
- **Other styles:** Vega (classic), Lyra (sharp corners, small text), Mira (very compact).
- **Versions:** The look of every app changed, so each app got a small version step.

## 2026-11-10: ETF prices from Alpha Vantage (kursverlauf)

- **Decision:** `kursverlauf` gets the prices from Alpha Vantage, with a free key that the user types in. The free key allows 25 requests per day and 1 request per second.
- **Decision:** The app uses only the weekly prices (`TIME_SERIES_WEEKLY_ADJUSTED`). With the free key, daily prices go back only 100 days, but weekly prices go back to the start of the ETF (for example 2011). One request per ETF gives all of it. The newest entry is the close of the last trading day, also in a week that is not complete. There are no live prices.
- **Decision:** The app shows the close with splits corrected, but not adjusted for dividends. Alpha Vantage gives two values per week: the close and the adjusted close (adjusted for splits and dividends). The app compares the ratio "adjusted close / close" of each week with the ratio of the next newer week. If the ratio changes by more than 1.5 times (up or down), there was a split. The size of this change is the split ratio (for example 1/25). The app multiplies all older closes by it. A dividend changes the ratio by a few percent only, so the app ignores it. Example: the 25:1 split of SPDR MSCI ACWI IMI (IE00B3YLTY66) on 2026-02-23.
- **Decision:** The data file keeps only the last download per ETF. A new download replaces it. A failed download keeps the old data, and the app shows a German message on the card of that ETF.
- **Decision:** At the start, the app downloads the ETFs whose download is from an earlier day (local time of the computer), or that have no download. It tries each ETF once per session automatically. The button "Kurse aktualisieren" downloads only the ETFs with an error, without prices, or with a download older than 1 hour. Else the button is off. Thus 3 ETFs need about 3 requests per day. A new key tries all ETFs again. If the user reaches 25 requests in a day, the app says so.
- **Decision:** The app sends one request to Alpha Vantage at a time, at least 1.5 seconds apart. Alpha Vantage answers each refused request with HTTP 200 and a JSON field `Information`. The text tells the reason: "per second" or the daily limit. The app shows a message and does not try again by itself.
- **Decision:** The search by ISIN or ticker uses Twelve Data (`symbol_search`). The search needs no key. Only the prices of Twelve Data need a paid plan (see "Rejected"). The app keeps the hits with `mic_code` `XETR` (Xetra), because Alpha Vantage has prices for Xetra. It adds `.DEX` to the ticker: `VGWL` becomes `VGWL.DEX`. The names of Twelve Data are not always right, so the user can change the name before the app adds the ETF.
- **Decision:** The comparison chart starts all lines at the first date that all ETFs have. Else an ETF with a longer history would compare a longer time. Below the chart, a list shows the change of each ETF as text.
- **Decision:** The comparison has the option "Mit Ausschüttungen". Then it uses the adjusted close of Alpha Vantage (splits and dividends). Without it, a distributing ETF looks worse than an accumulating ETF, because its price drops by each dividend. The cards always show the real close.
- **Migration (schema version 2, app 2.0):** Each stored price got the second value `total`. Version 1 has no such value. The stored prices are only a copy of Alpha Vantage, so `to-v2` removes them and keeps the key and the ETFs. The app then loads the prices again (one request per ETF).
- **Decision:** The section "Rendite" shows the return per calendar year. A year goes from the last weekly close of the year before to the last weekly close of the year. A week over the turn of the year counts to the new year.
- **Decision:** The section also shows the average return per year since the first close of each ETF (compound annual growth rate). The app shows it only with at least 1 year of data. Over a shorter time, a small change gives an absurd value. The option "Mit Ausschüttungen" applies to the whole section.
- **Decision:** The card of a distributing ETF shows its dividends. It shows the sum of the last 12 months per share and the dividend yield (this sum divided by the last close). It also shows the last 4 dividends and the sum per year.
- **Detail:** Alpha Vantage gives the dividend in the week of the ex-date (`7. dividend amount`). Thus the app shows the date of that week, not the payment date. This needs no extra request.
- **Migration (schema version 3, app 3.0):** Each download got the list `dividends`. Like `to-v2`, the migration `to-v3` removes the stored prices and keeps the key and the ETFs.
- **Accepted risk:** The key is in the data file. The data file can be in a cloud folder (OneDrive, Google Drive). The key is free and gives access only to market data, so this risk is small.
- **Rejected:** onvista (no key and good data, but its terms forbid automatic requests). Yahoo, justETF, Börse Frankfurt, EODHD, Stooq (no CORS or bot blocking). The prices of Twelve Data (Xetra needs a paid plan). Marketstack (100 requests per month, 1 year). A GitHub Action that copies prices to GitHub Pages (the terms of the sources forbid publishing them).
- **Size:** About 800 weekly prices per ETF are about 40 KB in the data file. This is no problem.

## 2026-11-10: Charts with Recharts (shadcn chart)

- **Decision:** Charts use Recharts 3, through the shadcn component `chart` in `packages/ui`. `@pocket-apps/ui/charts` gives the chart parts (for example `Sankey`, `Treemap`, `BarChart`) to the apps. ESLint forbids a direct import of `recharts` in apps.
- **Why:** One library has all the charts that we need: Sankey, treemap, bars and stacked bars. It draws SVG, so it reads the theme variables, and dark mode works with no extra code. It is MIT, well kept, and works with React 19. Actual Budget uses it for its Sankey report.
- **Rejected:** ECharts (best Sankey, but canvas cannot read CSS variables, and it is about 2.5 times larger). Nivo (no release since May 2025). d3-sankey or visx (we would draw all SVG ourselves). Chart.js and Plotly (canvas, or too large).
- **Cost:** Recharts adds about 155 KB (gzip) to an app file that uses it. Apps without charts do not get it.
- **Decision:** The chart colors `--chart-1` to `--chart-8` are the 8 colors of a checked palette, in a fixed order, with their own values for dark mode. `--chart-other` is gray for "Sonstiges". The order passed a check for color blindness and contrast. In light mode, three colors (`--chart-3` aqua, `--chart-4` yellow, `--chart-5` pink) have less than 3:1 contrast. Thus charts also show their values as text.

## 2026-11-10: Native select boxes, shared parseNumber

- **Decision:** Select boxes use shadcn `native-select`, not the Radix `select`. A native select works on phones and in jsdom tests. A list of icons uses a `ToggleGroup`, because a native select cannot show icons.
- **Decision:** `parseNumber()` moved from `zinsrechner` to `@pocket-apps/core/numbers`, because `fixkosten` also needs it. It reads German and plain inputs ("1.234,5", "10.000", "1234.5") and returns `null` for a wrong input.

## 2026-11-10: Favorite apps in the launcher

- **Decision:** The user marks an app as a favorite with a star button on its card. A filled star shows a favorite. The launcher shows the favorites first, in the section "Favoriten". The other apps come after them, in the section "Weitere Apps".
- **Decision:** There is one order for all apps. "Reihenfolge ändern" shows one list without sections. The launcher splits this order into the two sections. Thus an arrow button cannot move an app into the other section.
- **Decision:** Without favorites, the launcher shows one grid without sections, as before. It hides a section that has no apps.
- **Decision:** `launcher.json` keeps the favorite apps in the field `favorites`, as a list of app names (the `name` in `package.json`). The order of this list has no effect. Names of removed apps have no effect. A new app is not a favorite. This is schema version 2. The migration `to-v2` gives old files an empty list.
- **Decision:** The star button is not inside the link of the card. It is a separate element, positioned over the top right corner of the card. A button inside a link is not valid HTML.
- **Decision:** Without a folder, the launcher shows no star buttons and no sections. It cannot save the favorites.
- **Detail:** `vitest.setup.ts` gives jsdom an empty `ResizeObserver`. The tooltip of the star button needs it in unit tests.

## 2026-11-10: Browser tests only in Chromium

- **Decision:** The browser tests run only in Chromium. Firefox and WebKit are gone from `playwright.config.ts` and from `pnpm e2e:install`.
- **Why:** We support only Chrome and Edge. Edge uses the Chromium engine. Firefox and WebKit tested only the notice for other browsers. The installation of their system libraries made `CI - E2E` slow and unstable. WebKit also failed locally on macOS.
- **Detail:** `withoutFolderAccess(page)` in `e2e/helpers.ts` removes `showDirectoryPicker` before the page loads. Thus Chromium tests the notice for other browsers.
- **Limit:** No test checks the stateless apps in Firefox or Safari anymore.
- **Replaces:** The three browsers in "Browser tests with Playwright".

## 2026-11-10: Launcher with the data folder and the order of the apps

- **Decision:** The launcher is the main place to pick the data folder. It keeps the order of the apps in `launcher.json`.
- **Decision:** The launcher uses the data file store with `folderOptional: true`. It always shows the apps. Without a folder, a card above the apps asks for the folder. In Firefox and Safari, a short notice says that apps with data need Chrome or Edge. Stateless apps still work there.
- **Decision:** `launcher.json` keeps the names of all apps (the `name` in `package.json`, also of stateless apps) in the order that the user chose. New apps come after them, in build order. Names of removed apps have no effect.
- **Decision:** Each stateful app has the button "Ordner wechseln" in the status line. It works only when all changes are saved. Then a change of the folder cannot lose data.
- **Why:** The user sets up the folder once at the start page. A visit to the launcher in Firefox must not show an empty page.

## 2026-11-10: Data folder store in core, browser tests over http

- **Decision:** `packages/core` gets the data folder: `DataFolderGate` (pick the folder, give access again) and a store that reads and writes `<app>.json` in the folder. The folder handle stays in IndexedDB (database `pocket-apps`, store `settings`).
- **Decision:** The store saves each change automatically after 500 ms. Before each save, it compares the time of the last change of the file. If another device changed the file, the store does not save. The user loads the other version or saves their own version.
- **Decision:** After a failed save, the store tries again after 5 seconds. It warns before the tab closes while a change is not saved.
- **Decision:** Before a migration, the store writes the old file into the folder as `<app>.backup-v<N>.json`. If this file exists, it uses `<app>.backup-v<N>-2.json` and so on. Then it saves the new shape automatically. If the backup fails, it does not change the data file.
- **Decision:** When the browser lost the access to the folder while the app is open, the buttons "Jetzt erneut versuchen" and "Erneut laden" ask for access again.
- **Limit:** The store checks for changes from other devices only before a save. A sync program can change the file between this check and the write. This gap is short, so we accept it.
- **Decision:** The file name comes from the `app` field in `schema.ts`, not from `package.json`. The two are the same (see AGENTS.md), but the schema is the ID of the data.
- **Decision:** The browser tests use a local web server (`pnpm serve`, `http://localhost:4173/pocket-apps/`) instead of `file://`. The path is the same as on GitHub Pages.
- **Decision:** In Chromium, the tests replace the folder dialog. It returns a folder in the private file system of the browser (OPFS). Thus the tests use the real File System Access API for reading and writing. Firefox and WebKit test the notice "Bitte Chrome oder Edge verwenden".
- **Detail:** Unit tests use `fake-indexeddb` for the IndexedDB code, because jsdom has no IndexedDB.
- **Replaces:** The open and save dialogs per file, the download fallback for Firefox and Safari, and the "Speichern" button after a migration.

## 2026-11-09: Apps on GitHub Pages, data in a local folder (like draw.io)

- **Decision:** The apps come only from GitHub Pages (`johschmidt42.github.io/pocket-apps`). There is no release to Google Drive and no opening by double-click anymore.
- **Decision:** Each person picks one local data folder once: "Pocket Apps Daten". The apps read and write it with the File System Access API. The folder can be inside a sync folder (Google Drive, OneDrive, Dropbox). Then the sync program does the backup.
- **Decision:** Only Chrome and Edge on a computer. No smartphones for now. Other browsers show a clear notice.
- **Decision:** No user management for now. The user is the person who picked the folder. No shared data for now. A static export per app is an idea for later.
- **Layout:** `launcher.json` (launcher preferences, e.g. app order) and one `<app>.json` per app (data and preferences). Large files (images, music, video) go into `<app>/…` next to it; the JSON file refers to them.
- **Why:** No server, no login, data as files that the person owns. Under a web address, Chrome offers "Allow on every visit": after that, 0 clicks, also after a restart. Under `file://`, Chrome asks again after each restart.
- **Proof:** Prototypes and measurements on the branch `prototype/workspace-folder` (README). Also tested there: Android (1 tap per visit, slow with a Drive folder) and the Google Drive API (works on every device, but a login click per hour and full Drive access). Both are possible later.
- **Replaces:** "CD to Google Drive with rclone and scope drive.file" and "Own OAuth client for the Drive upload" (no Drive release anymore). "App and data in separate files" stays true.

## 2026-11-09: Own OAuth client for the Drive upload

- **Decision:** rclone uses an OAuth client ("Desktop app") of our own Google Cloud project. The secrets `GDRIVE_CLIENT_ID` and `GDRIVE_CLIENT_SECRET` hold it.
- **Why:** rclone's shared client ID stops working in 2026. rclone showed this warning at the first upload.
- **Detail:** The consent screen is "In production" with only the non-sensitive scope `drive.file`. Thus the login does not end after 7 days, and Google does not need to verify the app.
- **Consequence:** `drive.file` gives access per client. The switch needed a new folder.
- **Detail:** To publish the app, Google needs a home page URL, a privacy policy URL and their domain as "Authorised domain". We use the public GitHub profile and `github.com`. Authorised domains give no access to the Drive.

## 2026-11-09: CD to Google Drive with rclone and scope drive.file

- **Decision:** `CD - Release` uploads `release/*.html` to a Google Drive folder with rclone. It starts after a successful `CI - E2E` run on `main`. It uploads the artifact of that run, thus exactly the tested files.
- **Decision:** The repository variable `GDRIVE_FOLDER_ID` turns the pipeline on. The secret `GDRIVE_TOKEN` holds the rclone OAuth token.
- **Decision:** The token has the scope `drive.file`. It can only access files that rclone created. If the token leaks, an attacker can change or delete only the app files, not other files in the Drive.
- **Consequence:** rclone must create the folder itself. The folder that the user created before cannot be used.
- **Rejected:** Full Drive scope (a leaked token gives access to the whole Drive). A separate Google account (more setup, the data files in the shared folder are still visible). A service account (no storage quota in a personal Drive).
- **Detail:** The CD job uses only official GitHub actions, pinned to a commit hash.
- **Detail:** `rclone sync --checksum` uploads only files with a changed content. This works because the build is deterministic: the same code gives the same bytes, on macOS and in CI. Thus the date in Drive shows the last real change, and Drive keeps no empty versions.
- **Review fixes:** CD runs only for a push to `main` of this repository (no pull requests, no forks). It uploads only the newest commit of `main`, and only if all five CI pipelines passed for it. It installs a fixed rclone version with a checksum. The setup script stops if the rclone remote has a scope other than `drive.file`.

## 2026-11-09: GitHub Actions and Conventional Commits

- **Decision:** CI pipelines are named `CI - <what>`. CD pipelines are named `CD - <what>`.
- **Decision:** The first pipelines are the lint checks: `CI - Lint` (ESLint), `CI - Format` (Prettier) and `CI - Typecheck` (TypeScript). Each check is a separate pipeline. Then GitHub shows which check failed.
- **Decision:** A local composite action `.github/actions/setup` installs Node.js (version from `.nvmrc`), pnpm and the dependencies. All pipelines use it. `.nvmrc` is the only place for the exact Node.js version, for nvm and for the CI. `engines.node` in `package.json` is only the minimum (`>=24`).
- **Decision:** Commit messages follow Conventional Commits. The scope is the app or package.
- **Added:** `CI - Test` (unit tests with coverage) and `CI - E2E` (browser tests in Chromium, Firefox and WebKit). `CI - E2E` caches the Playwright browsers. It retries a failed test once for a trace, but a flaky test still fails the pipeline (`failOnFlakyTests`).
- **Added:** `CD - Release`. See "CD to Google Drive with rclone and scope drive.file".

## 2026-11-09: Versions with two numbers, icons on the launcher

- **Decision:** App versions have two numbers, `major.minor`. Apps start at `1.0`. A big change increases the first number. A small change or fix increases the second.
- **Detail:** npm needs three parts. `package.json` has `"1.0.0"`, and the third part is always `0`. The build shows `1.0` and validates the format.
- **Decision:** The launcher shows the version without the word "Version". It shows data file and internet access as icons with a tooltip. Screen readers read the full text.

## 2026-11-09: Apps declare internet access

- **Decision:** Each app declares `pocketApp.network` (`true` or `false`) in its `package.json`. The launcher shows "Braucht Internet" or "Offline" on each card.
- **Enforcement:** In apps with `"network": false`, ESLint forbids `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`. `eslint.config.js` reads the flag of each app with `listApps()`.
- **Why:** Users must see which apps work offline. The label must not be wrong, so a tool checks it.
- **Rule:** No API keys or passwords in the code. Everyone who has the app file can read it.

## 2026-11-09: Fixes after the first code review

- **Status:** "Data folder store in core, browser tests over http" replaces the first three points.
- **No automatic save after a migration.** The backup is a download that the app cannot confirm. Thus the app waits for the user to click "Speichern" after a migration. It shows a notice about the backup.
- **Write access at open (Chrome, Edge).** The app asks for write access right after the user opens a file. If an automatic save still fails, the status shows "Nicht gespeichert". The user then saves with the button.
- **Later release of download memory.** The app frees the memory of a download 1 second after the click. Some browsers start the download late.
- **Validated config.** The build validates `package.json` and `pocket-apps.config.json` with zod.
- **Not changed:** The app ID is in `schema.ts` and in `package.json`. Two tabs with the same data file can overwrite each other (see README).
- **Checked:** The theme choice stays when the user goes from the launcher to an app. A browser test checks this in Chromium, Firefox and WebKit.

## 2026-11-09: Launcher app and back link

- **Decision:** The start page `release/index.html` is a small app in `launcher/`. It uses the same header, theme and components as the apps. It shows a card and a search for all apps.
- **Decision:** Each app has a back link "Alle Apps" to the launcher. `pocket-apps.config.json` turns it on or off for all apps. `pocketApp.backLink: false` turns it off for one app.
- **Why:** The shared folder needs a start page that looks good and works offline. Apps and launcher are in the same folder, so the relative link `./index.html` works under `file://`.
- **Why configurable:** An app file can also go out alone, without the launcher. Then the back link would lead nowhere.
- **Replaces:** The plain HTML overview that `scripts/build-release.mjs` wrote before.

## 2026-11-09: One app info object

- **Decision:** The build makes the app info available as one constant `__POCKET_APP__` (name, title, version, description, emoji, stateful, back link). The launcher also gets `__POCKET_APPS__`, the list of all apps.
- **Why:** One object is easier to pass to `AppHeader` and the data file store than single constants.
- **Replaces:** The constants `__APP_NAME__`, `__APP_TITLE__` and `__APP_VERSION__`.

## 2026-11-09: Browser tests with Playwright

- **Decision:** Playwright tests open each app file from `release/` via `file://` in Chromium, Firefox and WebKit. They block all network requests.
- **Why:** Unit tests in jsdom do not see the build, the single-file inlining, missing Tailwind classes or browser differences.
- **Proof:** The first run found a Firefox bug. Firefox sends a `cancel` event before the `change` event of a file selection. The file input fallback now waits 1 second after `cancel` (`CANCEL_GRACE_MS`).
- **Limit:** The tests cannot use the real file pickers of Chrome and Edge. They use a fake File System Access API in the page.
- **Status:** "Data folder store in core, browser tests over http" replaces `file://`, the file input fallback and the fake API.

## 2026-11-09: Lint all file types with ESLint

- **Decision:** ESLint also checks JSON (`@eslint/json`), Markdown (`@eslint/markdown`), CSS (`@eslint/css` with `tailwind-csstree`) and HTML (`@html-eslint`).
- **Why:** One tool and one command for all files. Prettier formats all of them.
- **Detail:** The format rules of `@html-eslint` are off, because Prettier does the formatting.

## 2026-11-09: Light mode default with a theme switch

- **Decision:** Light mode is the default. `AppHeader` has a switch for dark mode in every app. The class `dark` on `<html>` selects dark mode.
- **Why:** The user wants light mode first and dark mode always available.
- **Detail:** The browser remembers the choice in `localStorage`. This is only a convenience. Under `file://`, some browsers do not keep it. Then the app starts in light mode again.
- **Replaces:** "Dark mode from the system setting".

## 2026-11-09: Title and version come from package.json

- **Decision:** The build reads `pocketApp.title` and `version` from the app's `package.json`. It sets `<title>`, and the meta tags `pocket-app-name` and `pocket-app-version`. See also "One app info object".
- **Why:** There is one place for each value. Everyone can read the version of an app file, also without opening it.
- **Detail:** The app file name has no version. A new file replaces the old one.

## 2026-11-09: Component libraries in packages/ui

- **Decision:** Apps take all UI components from `packages/ui`. Today these are shadcn components.
- **Why:** shadcn is only one option. Another library is allowed. It must go into `packages/ui` with a decision entry. Use one library per kind of component.

## 2026-11-09: pnpm from Homebrew

- **Decision:** Install pnpm with `brew install pnpm`.
- **Why:** Node comes from nvm. A global npm package belongs to one Node version and is gone after a version change. Corepack 0.32 cannot start pnpm 12. pnpm itself switches to the version in `packageManager`.

## 2026-11-09: Tests with jsdom, not Vitest Browser Mode

- **Decision:** Vitest with jsdom and Testing Library.
- **Why:** It is simple, fast and needs no browser download. The current shadcn components work in jsdom without polyfills.
- **Rejected for now:** Vitest Browser Mode. Vitest recommends it for component tests. Change to it if Radix components need many polyfills in jsdom.
- **Addition:** Playwright tests the built app files in real browsers. See "Browser tests with Playwright".

## 2026-11-09: ESLint and Prettier, TypeScript 6.0

- **Decision:** ESLint (typescript-eslint `strictTypeChecked`, react-hooks, jsx-a11y, testing-library) and Prettier with the Tailwind plugin.
- **Why:** This set enforces the most rules from `AGENTS.md`. Speed is not important in a small repo.
- **Consequence:** typescript-eslint supports TypeScript only up to 6.0. TypeScript 7 (Go port) has no compiler API yet. We pin TypeScript 6.0.x.
- **Workaround:** `eslint-plugin-jsx-a11y` 6.10.2 does not list ESLint 10 as a supported version. The `peerDependencyRules` entry in `pnpm-workspace.yaml` allows it. Remove that entry when the plugin supports ESLint 10.
- **Rejected:** Biome. Its type-aware rules are still experimental.
- **Rejected:** Oxlint. It supports TypeScript 7, but its React Compiler rules need experimental plugins.

## 2026-11-09: sql.js for apps that need SQLite

- **Decision:** If an app needs SQLite, use `sql.js` ≥ 1.15.2 with the inline build `sql.js/dist/sql-wasm-inline.js`.
- **Why:** It loads a database from bytes with one call. It exports the database to bytes with one call. The inline build contains the WebAssembly code in the JavaScript file. Thus it works in one HTML file under `file://`. It is the smallest option (about 440 KB gzip). A test on 2026-11-09 passed in Chromium, WebKit and Firefox.
- **Rejected:** `@sqlite.org/sqlite-wasm`. It is bigger. It needs more code for import and export. It cannot import files in WAL mode. Use `@sqlite.org/sqlite-wasm` only if an app needs full-text search (FTS5).
- **Rejected:** Turso in the browser. It needs a separate worker file.
- **Rule:** JSON stays the default format.

## 2026-11-09: Dark mode from the system setting (replaced)

- **Status:** Replaced by "Light mode default with a theme switch".
- **Decision:** The theme used `@media (prefers-color-scheme: dark)`. There was no theme switch.
- **Why:** No JavaScript is needed. `localStorage` is not reliable under `file://`, so a saved user choice could get lost.

## 2026-11-09: App and data in separate files

- **Decision:** The app is one HTML file. The data is a separate JSON file that the user owns. There is no server, no hosting and no browser storage as the source of truth.
- **Why:** Users can share the app file. Updates replace only the app file. Clearing the browser does not delete data.
- **Consequence:** Chrome and Edge save directly into the file (File System Access API). Firefox and Safari save by download. ("Apps on GitHub Pages, data in a local folder" replaces this: only Chrome and Edge, with a data folder.)
- **Consequence:** Phones cannot open a local HTML file reliably. We do not support phones. Layouts must still work in narrow browser windows.
