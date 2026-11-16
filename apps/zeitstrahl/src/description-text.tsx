import { Fragment } from "react";
import { parseDescription, type Line } from "./description.ts";

/** The parts of one line: normal text and bold text. */
function LineText({ line }: { line: Line }) {
  return line.spans.map((span) =>
    span.bold ? (
      <strong key={span.start} className="font-semibold">
        {span.text}
      </strong>
    ) : (
      <Fragment key={span.start}>{span.text}</Fragment>
    ),
  );
}

/**
 * The description of an entry with its small format: paragraphs, lists and bold text (see
 * `description.ts`). The keys are line numbers and positions in the text: the text has no IDs.
 */
export function DescriptionText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5 leading-relaxed">
      {parseDescription(text).map((block) =>
        block.kind === "list" ? (
          <ul key={block.line} className="flex list-disc flex-col gap-0.5 pl-4">
            {block.items.map((item) => (
              <li key={item.line}>
                <LineText line={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={block.line}>
            {block.lines.map((line, index) => (
              <Fragment key={line.line}>
                {index > 0 && <br />}
                <LineText line={line} />
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
