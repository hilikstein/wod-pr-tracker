import Link from "next/link";
import { site } from "@/lib/site";

export function PageHero({
  image,
  kicker,
  title,
  lede,
  backHref,
}: {
  image: string;
  kicker: string;
  title: string;
  lede?: string;
  backHref?: string;
}) {
  return (
    <header className="page-hero" style={{ backgroundImage: `url(${site.basePath}/photos/${image})` }}>
      {backHref ? (
        <Link href={backHref} className="hero-back">
          Back
        </Link>
      ) : null}
      <div className="page-hero-copy">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {lede ? <p className="lede mt-2">{lede}</p> : null}
      </div>
    </header>
  );
}
