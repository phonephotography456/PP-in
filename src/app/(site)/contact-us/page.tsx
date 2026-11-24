import { Field } from "@/components/PanelUI";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <section className="container-page py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Contact Us</h1>
      <p className="mt-1 text-muted">Questions about listing or finding a photographer? We reply within one working day.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {[
            ["Email", "hello@phonephotography.in", "mailto:hello@phonephotography.in"],
            ["Phone", "+91 00000 00000", "tel:+910000000000"],
            ["WhatsApp", "+91 00000 00000", "https://wa.me/910000000000"],
          ].map(([label, value, href]) => (
            <a key={label} href={href} className="card block p-5 transition hover:border-ink">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-0.5 font-semibold">{value}</p>
            </a>
          ))}
        </div>

        <form className="card grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Name"><input className="input" /></Field>
          <Field label="Email"><input className="input" type="email" /></Field>
          <Field label="Message" className="sm:col-span-2"><textarea className="input min-h-32" /></Field>
          <div className="sm:col-span-2"><button className="btn-primary">Send message</button></div>
        </form>
      </div>
    </section>
  );
}
