import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon = "list",
  title,
  children,
}: {
  icon?: IconName;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <b>{title}</b>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
