import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon = "list",
  title,
  children,
  as: Title = "b",
}: {
  icon?: IconName;
  title: string;
  children?: React.ReactNode;
  /** Use "h1" when the empty state is the whole page, so the page still has a main heading. */
  as?: "b" | "h1" | "h2";
}) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <Title className="empty-t">{title}</Title>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
