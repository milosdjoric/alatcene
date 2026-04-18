import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "O sajtu — cenealata.in.rs",
  description:
    "Informacije o sajtu cenealata.in.rs — kako funkcioniše, izvori podataka, uslovi korišćenja i politika privatnosti.",
};

const sources = [
  "Shoppster",
  "Super Alati",
  "Gama Alati",
  "Prodavnica Alata",
  "Najpovoljniji Alati",
  "Omni-Alati",
  "SBT-Alati",
  "ePlaneta",
  "Metalflex",
  "Simns",
  "Boss Shop",
  "Axis Shop",
  "KlikLak",
  "Od Igle Do Lokomotive",
  "Tim Komerc",
  "Woby Haus",
  "Amcarco",
];

export default async function InfoPage() {
  const supabase = createServerClient();
  const { data: lastRow } = await supabase
    .from("products")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  const lastUpdated = lastRow?.updated_at ?? null;

  return (
    <>
      {/* Header */}
      <header className="bg-[#16181d] border-b border-[#2a2d35] sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-6">
            <Link href="/" className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-lg font-bold tracking-tight text-[#e0e2e7]">cene</span>
              <span className="text-lg font-bold tracking-tight text-[#c8e64a]">alata</span>
              <span className="text-xs text-[#555963] font-normal ml-0.5">.in.rs</span>
            </Link>
            <div className="hidden sm:flex items-center gap-3 text-xs text-[#8b8f9a] ml-auto">
              <span>17 prodavnica</span>
              <span className="text-[#2a2d35]">/</span>
              <span>34k+ alata</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex-1 w-full">
        <div className="max-w-3xl">
          {/* Naslov */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            <span className="text-[#e0e2e7]">O </span>
            <span className="text-[#c8e64a]">sajtu</span>
          </h1>
          <p className="text-[#555963] text-sm mb-12">
            Poslednje ažuriranje: april 2026.
          </p>

          {/* Šta je cenealata.in.rs */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider mb-4">
              Šta je cenealata.in.rs
            </h2>
            <div className="space-y-3 text-[#8b8f9a] text-sm leading-relaxed">
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
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider mb-4">
              Kako funkcioniše
            </h2>
            <div className="space-y-3 text-[#8b8f9a] text-sm leading-relaxed">
              <p>
                Svakodnevno, automatski prikupljamo javno dostupne podatke o
                proizvodima (naziv, cena, dostupnost) iz 17 online prodavnica.
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
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider mb-4">
              Izvori podataka
            </h2>
            <p className="text-[#8b8f9a] text-sm leading-relaxed mb-4">
              Trenutno pratimo cene iz sledećih prodavnica:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sources.map((source) => (
                <div
                  key={source}
                  className="px-3 py-2 bg-[#16181d] border border-[#2a2d35] text-sm text-[#8b8f9a]"
                >
                  {source}
                </div>
              ))}
            </div>
          </section>

          {/* Važne napomene / Disclaimer */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider mb-4">
              Važne napomene
            </h2>
            <div className="bg-[#16181d] border border-[#2a2d35] p-5">
              <ul className="space-y-3 text-[#8b8f9a] text-sm leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-[#c8e64a] flex-shrink-0">—</span>
                  Cene prikazane na sajtu su informativnog karaktera i mogu se
                  razlikovati od aktuelnih cena u prodavnicama.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#c8e64a] flex-shrink-0">—</span>
                  Uvek proverite konačnu cenu i dostupnost na sajtu prodavnice pre
                  kupovine.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#c8e64a] flex-shrink-0">—</span>
                  cenealata.in.rs nije odgovoran za tačnost podataka, dostupnost
                  proizvoda, niti za transakcije obavljene u prodavnicama.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#c8e64a] flex-shrink-0">—</span>
                  Sajt nije povezan ni sa jednom od navedenih prodavnica i ne
                  prima proviziju od prodaje.
                </li>
              </ul>
            </div>
          </section>

          {/* Uslovi korišćenja */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider mb-4">
              Uslovi korišćenja
            </h2>
            <div className="space-y-3 text-[#8b8f9a] text-sm leading-relaxed">
              <p>
                Korišćenjem sajta cenealata.in.rs prihvatate sledeće uslove:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2">
                  <span className="text-[#555963]">1.</span>
                  Sajt pruža informativne usluge poređenja cena i ne predstavlja
                  prodavnicu niti posrednika u prodaji.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#555963]">2.</span>
                  Svi prikazani podaci potiču iz javno dostupnih izvora i
                  prikazani su u dobroj nameri.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#555963]">3.</span>
                  Ne garantujemo tačnost, potpunost ili ažurnost prikazanih
                  podataka.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#555963]">4.</span>
                  Zabranjeno je automatizovano prikupljanje podataka sa ovog sajta
                  (scraping) bez prethodne saglasnosti.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#555963]">5.</span>
                  Zadržavamo pravo da u bilo kom trenutku izmenimo ove uslove ili
                  prestanemo sa radom sajta.
                </li>
              </ul>
            </div>
          </section>

          {/* Privatnost */}
          <section className="mb-12">
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider mb-4">
              Privatnost
            </h2>
            <div className="space-y-3 text-[#8b8f9a] text-sm leading-relaxed">
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
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider mb-4">
              Kontakt
            </h2>
            <p className="text-[#8b8f9a] text-sm leading-relaxed">
              Za pitanja, primedbe ili zahteve za uklanjanje podataka, možete nas
              kontaktirati na{" "}
              <a
                href="mailto:djoric.inbox@gmail.com"
                className="text-[#c8e64a] hover:text-[#a8c230] transition-colors"
              >
                djoric.inbox@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2d35] mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#8b8f9a]">cenealata.in.rs</span>
              <span className="text-[#2a2d35]">/</span>
              <span className="text-[#555963]">17 prodavnica</span>
            </div>
            <p className="text-xs text-[#555963]">
              cene ažurirane {lastUpdated
                ? new Date(lastUpdated).toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
