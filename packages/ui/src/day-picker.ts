// The calendar of react-day-picker. Apps import it from here, never from "react-day-picker" directly.
// Apps give it Tailwind classes through `classNames`. There is no CSS file of react-day-picker.
// The shadcn component `calendar` does not pass our strict typecheck (exactOptionalPropertyTypes),
// and we do not change vendor code. Thus this file exports the library itself, like charts.ts.
export { DayPicker } from "react-day-picker";
export type { ClassNames, DayProps, Matcher } from "react-day-picker";
export { de } from "react-day-picker/locale";
