import { UserRound } from "lucide-react";
import { CONTACT_ICONS } from "../contact-kinds.ts";
import type { ListRow, Person, Project, Section, Station, Variant } from "../schema.ts";
import { contactHref, formatRange, keyedLines, splitName } from "../text.ts";
import { CV_LABELS, type CvLabels } from "./labels.ts";

export type ModernCvProps = {
  person: Person;
  variant: Variant;
  /** The photo as a data URL, or `null`. */
  photoUrl: string | null;
};

/**
 * The design "modern": a sans-serif font, one accent color, a round photo, section titles
 * in the accent color with a thin line, and the tools of a project as small chips. A clean look for
 * freelance project profiles. The classes belong to `modern.css`. The marks for the pages
 * and the highlight (`data-page-unit`, `data-section-id`, `data-entry-id`) work as in
 * `klassisch-cv.tsx`.
 */
export function ModernCv({ person, variant, photoUrl }: ModernCvProps) {
  const labels = CV_LABELS[variant.language];
  const contacts = person.contacts.filter((contact) => contact.value.trim() !== "");
  const [firstNames, lastName] = splitName(person.name);
  return (
    <article className="cv">
      <header className="cv-head" data-page-unit="">
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
        <div className="cv-head-text">
          {lastName !== "" && (
            <h1 className="cv-name">
              {firstNames !== "" && <span className="cv-name-first">{firstNames} </span>}
              <span className="cv-name-last">{lastName}</span>
            </h1>
          )}
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
        </div>
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
          <SectionEntries section={section} labels={labels} />
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
      return section.entries.map((station) => (
        <StationBlock key={station.id} station={station} labels={labels} />
      ));
    case "list":
      return section.entries.map((row) => <ListRowBlock key={row.id} row={row} />);
  }
}

function ProjectBlock({ project, labels }: { project: Project; labels: CvLabels }) {
  const range = formatRange(project.from, project.to, labels.since);
  const meta = [project.role, project.client].filter((text) => text.trim() !== "").join(" · ");
  return (
    <div className="cv-entry cv-project" data-page-unit="" data-entry-id={project.id}>
      <div className="cv-entry-head">
        <h3 className="cv-entry-title">{project.title}</h3>
        {range !== null && <span className="cv-entry-date">{range}</span>}
      </div>
      {meta !== "" && <p className="cv-entry-subtitle">{meta}</p>}
      {project.description.trim() !== "" && <p className="cv-description">{project.description}</p>}
      {project.tasks.length > 0 && <Bullets items={project.tasks} />}
      {project.tools.length > 0 && (
        <ul className="cv-chips" aria-label={labels.tools}>
          {keyedLines(project.tools).map((line) => (
            <li key={line.key}>{line.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StationBlock({ station, labels }: { station: Station; labels: CvLabels }) {
  return (
    <div className="cv-entry cv-station" data-page-unit="" data-entry-id={station.id}>
      <div className="cv-entry-head">
        <h3 className="cv-entry-title">{station.title}</h3>
        <span className="cv-entry-date">{formatRange(station.from, station.to, labels.since)}</span>
      </div>
      {station.subtitle.trim() !== "" && <p className="cv-entry-subtitle">{station.subtitle}</p>}
      {station.bullets.length > 0 && <Bullets items={station.bullets} />}
    </div>
  );
}

function ListRowBlock({ row }: { row: ListRow }) {
  return (
    <div className="cv-list-row" data-page-unit="" data-entry-id={row.id}>
      <h3 className="cv-list-label">{row.label}</h3>
      <ul className="cv-list-items">
        {keyedLines(row.items).map((line) => (
          <li key={line.key}>{line.text}</li>
        ))}
      </ul>
    </div>
  );
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
