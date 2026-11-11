import { signOut } from "@/app/actions/sign-out";
import { Icon } from "@/components/ui/Icon";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="btn ghost sm" type="submit">
        <Icon name="logout" />
        <span>Sign out</span>
      </button>
    </form>
  );
}
