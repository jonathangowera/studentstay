import { Icon } from "./Icon";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span className="field-error" id={id}>
      <Icon name="alert" />
      {message}
    </span>
  );
}
