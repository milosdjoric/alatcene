import type { Metadata } from "next";
import { SITE_URL, SOURCES } from "@/lib/constants";
import { getSiteStats } from "@/lib/site-stats";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "O sajtu",
  alternates: { canonical: `${SITE_URL}/info` },
  description:
    "Informacije o sajtu cenealata.in.rs — kako funkcioniše, izvori podataka, uslovi korišćenja i politika privatnosti.",
};

export default async function InfoPage() {
  const { sources, storeCount } = await getSiteStats();

  return (
    <>
      <SiteHeader showSearch />

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex-1 w-full">
        <div className="max-w-3xl">
          {/* Naslov */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            <span className="text-foreground">O </span>
            <span className="text-accent">sajtu</span>
          </h1>
          <p className="text-subtle text-sm mb-12">
            Poslednje ažuriranje: april 2026.
          </p>

          {/* Šta je cenealata.in.rs */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
              Šta je cenealata.in.rs
            </h2>
            <div className="space-y-3 text-muted text-sm leading-relaxed">
              <p>
                cenealata.in.rs je besplatan agregator cena alata i opreme iz srpskih
                online prodavnica. Sajt ne prodaje proizvode — samo prikazuje javno
                dostupne cene i linkuje na originalne prodavnice gde se kupovina
                obavlja.
              </p>
              <p>
                Cilj je da na jednom mestu uporediš cene istog alata iz više
                prodavnica i uštediš vreme i novac.
              </p>
            </div>
          </section>

          {/* Kako funkcioniše */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
              Kako funkcioniše
            </h2>
            <div className="space-y-3 text-muted text-sm leading-relaxed">
              <p>
                Svakodnevno, automatski prikupljamo javno dostupne podatke o
                proizvodima (naziv, cena, dostupnost) iz {storeCount} online prodavnica.
                Podaci se ažuriraju jednom dnevno, obično oko 06:00 po srpskom
                vremenu.
              </p>
              <p>
                Proizvodi se zatim normalizuju, kategorišu i čine dostupnim za
                pretragu i filtriranje na ovom sajtu.
              </p>
            </div>
          </section>

          {/* Izvori podataka */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
              Izvori podataka
            </h2>
            <p className="text-muted text-sm leading-relaxed mb-4">
              Trenutno pratimo cene iz sledećih prodavnica:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sources.map(({ izvor }) => (
                <div
                  key={izvor}
                  className="px-3 py-2 bg-surface border border-border text-sm text-muted"
                >
                  {SOURCES[izvor]?.label ?? izvor}
                </div>
              ))}
            </div>
          </section>

          {/* Važne napomene / Disclaimer */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
              Važne napomene
            </h2>
            <div className="bg-surface border border-border p-5">
              <ul className="space-y-3 text-muted text-sm leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-accent flex-shrink-0">—</span>
                  Cene prikazane na sajtu su informativnog karaktera i mogu se
                  razlikovati od aktuelnih cena u prodavnicama.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent flex-shrink-0">—</span>
                  Uvek proverite konačnu cenu i dostupnost na sajtu prodavnice pre
                  kupovine.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent flex-shrink-0">—</span>
                  cenealata.in.rs nije odgovoran za tačnost podataka, dostupnost
                  proizvoda, niti za transakcije obavljene u prodavnicama.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent flex-shrink-0">—</span>
                  Sajt nije povezan ni sa jednom od navedenih prodavnica i ne
                  prima proviziju od prodaje.
                </li>
              </ul>
            </div>
          </section>

          {/* Uslovi korišćenja */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
              Uslovi korišćenja
            </h2>
            <div className="space-y-3 text-muted text-sm leading-relaxed">
              <p>
                Korišćenjem sajta cenealata.in.rs prihvatate sledeće uslove:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2">
                  <span className="text-subtle">1.</span>
                  Sajt pruža informativne usluge poređenja cena i ne predstavlja
                  prodavnicu niti posrednika u prodaji.
                </li>
                <li className="flex gap-2">
                  <span className="text-subtle">2.</span>
                  Svi prikazani podaci potiču iz javno dostupnih izvora i
                  prikazani su u dobroj nameri.
                </li>
                <li className="flex gap-2">
                  <span className="text-subtle">3.</span>
                  Ne garantujemo tačnost, potpunost ili ažurnost prikazanih
                  podataka.
                </li>
                <li className="flex gap-2">
                  <span className="text-subtle">4.</span>
                  Zabranjeno je automatizovano prikupljanje podataka sa ovog sajta
                  (scraping) bez prethodne saglasnosti.
                </li>
                <li className="flex gap-2">
                  <span className="text-subtle">5.</span>
                  Zadržavamo pravo da u bilo kom trenutku izmenimo ove uslove ili
                  prestanemo sa radom sajta.
                </li>
              </ul>
            </div>
          </section>

          {/* Privatnost */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
              Privatnost
            </h2>
            <div className="space-y-3 text-muted text-sm leading-relaxed">
              <p>
                cenealata.in.rs ne prikuplja lične podatke korisnika. Ne koristimo
                kolačiće za praćenje, ne zahtevamo registraciju i ne čuvamo
                podatke o vašim pretragama.
              </p>
              <p>
                Sajt može koristiti anonimizovanu analitiku (broj poseta, tip
                uređaja) isključivo u svrhu poboljšanja korisničkog iskustva.
                Ovi podaci ne sadrže informacije koje mogu identifikovati
                pojedinačnog korisnika.
              </p>
            </div>
          </section>

          {/* Kontakt */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
              Kontakt
            </h2>
            <p className="text-muted text-sm leading-relaxed">
              Za pitanja, primedbe ili zahteve za uklanjanje podataka, možete nas
              kontaktirati na{" "}
              <a
                href="mailto:djoric.inbox@gmail.com"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                djoric.inbox@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
