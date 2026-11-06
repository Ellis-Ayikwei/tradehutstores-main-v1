import Link from "next/link";
import { Gavel, MapPin, MessageCircle, Phone, ShieldCheck, ShoppingBag } from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

// Static page - no client state needed.
export const metadata = {
  title: "About Us | TradeHut",
  description:
    "TradeHut is an online marketplace based at La Trade Fair, Accra, Ghana. Buy products, bid in auctions and request quotes from sellers.",
};

const OFFER = [
  {
    Icon: ShoppingBag,
    title: "Shop products",
    body: "Browse listings from sellers and buy with secure checkout.",
  },
  {
    Icon: Gavel,
    title: "Auctions and quotes",
    body: "Bid on auction items or post a request and receive quotes from sellers.",
  },
  {
    Icon: ShieldCheck,
    title: "Buyer protection",
    body: "Learn how we protect your purchases on our buyer protection page.",
    href: "/buyer-protection",
  },
];

const MAP_QUERY = encodeURIComponent("La Trade Fair, Accra, Ghana");

export default function AboutPage() {
  return (
    <MainLayout>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">About TradeHut</p>
          <h1 className="mt-2 font-syne text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            A marketplace based at La Trade Fair, Accra
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
            TradeHut brings buyers and sellers together in one place. Shop products, join auctions and request
            quotes, all from your phone or computer.
          </p>
        </header>

        <section aria-label="What you can do on TradeHut" className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {OFFER.map(({ Icon, title, body, href }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-3 font-syne text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{body}</p>
              {href ? (
                <Link href={href} className="mt-3 inline-flex min-h-[44px] items-center text-sm font-bold text-primary-700 hover:underline dark:text-primary-300">
                  Read more
                </Link>
              ) : null}
            </div>
          ))}
        </section>

        <section
          aria-label="Contact us"
          className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"
        >
          <h2 className="font-syne text-xl font-bold text-gray-900 dark:text-white">Contact us</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                href="tel:+233248138722"
                className="flex min-h-[44px] items-center gap-3 font-semibold text-gray-900 hover:text-primary-700 dark:text-white"
              >
                <Phone className="h-5 w-5 text-primary-600" aria-hidden />
                024 813 8722
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/233248138722"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center gap-3 font-semibold text-gray-900 hover:text-primary-700 dark:text-white"
              >
                <MessageCircle className="h-5 w-5 text-primary-600" aria-hidden />
                Chat on WhatsApp
              </a>
            </li>
            <li>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center gap-3 font-semibold text-gray-900 hover:text-primary-700 dark:text-white"
              >
                <MapPin className="h-5 w-5 text-primary-600" aria-hidden />
                La Trade Fair, Accra, Ghana
              </a>
            </li>
          </ul>
        </section>
      </main>
    </MainLayout>
  );
}
