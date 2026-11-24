import { PanelForm } from "@/components/PanelForm";
import { Field, PageTitle } from "@/components/PanelUI";
import { requirePhotographer } from "@/lib/photographer";
import { changePassword, logout, updateAccountEmail } from "../actions";

export const metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const user = await requirePhotographer();
  return (
    <>
      <PageTitle title="Account Settings" />
      <div className="grid max-w-3xl gap-6">
        <PanelForm action={updateAccountEmail} submit="Update email" className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Account details</h2>
          <Field label="Login email" className="sm:col-span-2">
            <input name="email" type="email" required className="input" defaultValue={user.email ?? ""} />
          </Field>
          <p className="text-xs text-muted sm:col-span-2">Changing your login email needs confirmation from the new address. Your public contact email is edited in My Profile.</p>
        </PanelForm>

        <PanelForm action={changePassword} submit="Change password" clearOnSuccess className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Change password</h2>
          <Field label="Current password" className="sm:col-span-2"><input name="current" type="password" required autoComplete="current-password" className="input" /></Field>
          <Field label="New password"><input name="next" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="input" /></Field>
          <Field label="Confirm new password"><input name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="input" /></Field>
        </PanelForm>

        <form action={logout}><button className="btn-outline w-fit">Log out</button></form>
      </div>
    </>
  );
}
