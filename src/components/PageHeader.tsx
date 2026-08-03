import type { ReactNode } from "react";
import "./PageHeader.css";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, eyebrow }: Props) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? (
          <p className="page-header__desc">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
