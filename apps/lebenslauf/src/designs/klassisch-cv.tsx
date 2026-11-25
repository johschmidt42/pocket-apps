import { UserRound } from "lucide-react";
import { Fragment } from "react";
import { CONTACT_ICONS } from "../contact-kinds.ts";
import type { ListRow, Person, Project, Section, Station, Variant } from "../schema.ts";
import { contactHref, formatMonth, formatRange, keyedLines } from "../text.ts";
import { CV_LABELS, type CvLabels } from "./labels.ts";

export type KlassischCvProps = {
  person: Person;
  variant: Variant;
  /** The photo as a data URL, or `null`. */
  photoUrl: string | null;
};

/**
 * The design "klassisch": a name box, contact lines with icons, and sections with gray bands.
 * The classes belong to `klassisch.css`. This markup is shown in the CV frame, not in the app.
 * `data-page-unit` marks the blocks that the print keeps on one page (`break-inside: avoid`).
 * The value "keep-with-next" marks a title with `break-after: avoid`. The preview uses the
 * marks to show the same pages as the print. `data-section-id` and `data-entry-id` let the
 * editor and the preview highlight the same section or entry.
 */
export function KlassischCv({ person, variant, photoUrl }: KlassischCvProps) {
  const labels = CV_LABELS[variant.language];
  const contacts = person.contacts.filter((contact) => contact.value.trim() !== "");
  return (
    <article className="cv">
      <header className="cv-head" data-page-unit="">
        {person.name.trim() !== "" && <h1 className="cv-name">{person.name}</h1>}
        {contacts.length > 0 && (
          <ul className="cv-contacts">
            {contacts.map((contact) => {
              const Icon = CONTACT_ICONS[contact.kind];
              const href = contactHref(contact.kind, contact.value);
              return (
                <li key={contact.id}>
                  <Icon aria-hidden="true" />
                  {href === null ? (
                    <span>{contact.value}</span>
                  ) : (
                    <a href={href}>{contact.value}</a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {photoUrl ? (
          <div className="cv-photo">
            <img src={photoUrl} alt="Foto" />
          </div>
        ) : (
          // Without a photo, the place stays free. On screen, a placeholder shows it.
          <div className="cv-photo cv-photo-empty" aria-hidden="true">
            <UserRound />
          </div>
        )}
      </header>
      {variant.profile.trim() !== "" && (
        <p className="cv-profile" data-page-unit="">
          {variant.profile.trim()}
        </p>
      )}
      {variant.sections.map((section) => (
        <section key={section.id} className="cv-section" data-section-id={section.id}>
          <h2 className="cv-section-title" data-page-unit="keep-with-next">
            {section.title}
          </h2>
          <div className="cv-section-body">
            <SectionEntries section={section} labels={labels} />
          </div>
        </section>
      ))}
    </article>
  );
}

function SectionEntries({ section, labels }: { section: Section; labels: CvLabels }) {
  switch (section.kind) {
    case "projects":
      return section.entries.map((project) => (
        <ProjectBlock key={project.id} project={project} labels={labels} />
      ));
    case "stations":
      return (
        <dl className="cv-rows">
          {section.entries.map((station) => (
            <StationRow key={station.id} station={station} labels={labels} />
          ))}
        </dl>
      );
    case "list":
      return (
        <dl className="cv-rows">
          {section.entries.map((row) => (
            <ListRowBlock key={row.id} row={row} />
          ))}
        </dl>
      );
  }
}

function ProjectBlock({ project, labels }: { project: Project; labels: CvLabels }) {
  const range = formatRange(project.from, project.to, labels.since);
  return (
    <div className="cv-project" data-page-unit="" data-entry-id={project.id}>
      <h3 className="cv-project-title">{project.title}</h3>
      <dl className="cv-rows">
        {range !== null && (
          <div className="cv-row">
            <dt>{labels.period}</dt>
            <dd>{range}</dd>
          </div>
        )}
        {project.role.trim() !== "" && (
          <div className="cv-row">
            <dt>{labels.role}</dt>
            <dd>{project.role}</dd>
          </div>
        )}
        {project.client.trim() !== "" && (
          <div className="cv-row">
            <dt>{labels.client}</dt>
            <dd>{project.client}</dd>
          </div>
        )}
        {project.description.trim() !== "" && (
          <div className="cv-row">
            <dt>{labels.description}</dt>
            <dd>{project.description}</dd>
          </div>
        )}
        {project.tasks.length > 0 && (
          <div className="cv-row">
            <dt>{labels.tasks}</dt>
            <dd>
              <Bullets items={project.tasks} />
            </dd>
          </div>
        )}
        {project.tools.length > 0 && (
          <div className="cv-row">
            <dt>{labels.tools}</dt>
            <dd>
              <Tools tools={project.tools} />
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function StationRow({ station, labels }: { station: Station; labels: CvLabels }) {
  const from = formatMonth(station.from);
  return (
    <div className="cv-row cv-station" data-page-unit="" data-entry-id={station.id}>
      <dt>
        {station.to === null ? (
          `${labels.since} ${from}`
        ) : (
          <>
            {from} –<br />
            {formatMonth(station.to)}
          </>
        )}
      </dt>
      <dd>
        <p className="cv-station-title">
          <strong>{station.title}</strong>
          {station.subtitle.trim() !== "" && ` ${station.subtitle}`}
        </p>
        {station.bullets.length > 0 && <Bullets items={station.bullets} />}
      </dd>
    </div>
  );
}

function ListRowBlock({ row }: { row: ListRow }) {
  return (
    <div className="cv-row cv-list-row" data-page-unit="" data-entry-id={row.id}>
      <dt>{row.label}</dt>
      <dd>
        <ul className="cv-items">
          {keyedLines(row.items).map((line) => (
            <li key={line.key}>{line.text}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

/**
 * "Python | Docker | Git". A line breaks only after a "|", so that no line starts with "|".
 * Each tool with its "|" is one span that does not break.
 */
function Tools({ tools }: { tools: readonly string[] }) {
  const lines = keyedLines(tools);
  return lines.map((line, position) => (
    <Fragment key={line.key}>
      {position > 0 && " "}
      <span className="cv-tool">
        {line.text}
        {position < lines.length - 1 && " |"}
      </span>
    </Fragment>
  ));
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="cv-bullets">
      {keyedLines(items).map((line) => (
        <li key={line.key}>{line.text}</li>
      ))}
    </ul>
  );
}
