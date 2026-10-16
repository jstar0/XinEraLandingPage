import { notFound } from "next/navigation";
import { entries, findEntry } from "@/features/journal/content";
import { Footer } from "@/components/site/footer";
export function generateStaticParams() {
  return entries.map(({ slug }) => ({ slug }));
}
export const dynamicParams = false;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = findEntry(slug);
  if (!entry) notFound();
  return {
    title: entry.title,
    description: entry.summary,
    alternates: { canonical: `/journal/${slug}` },
    openGraph: { title: entry.title, images: [entry.image], type: "article" },
  };
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = findEntry(slug);
  if (!entry) notFound();
  return (
    <>
      <header className="article-nav">
        <a href="/journal">← 返回旅途手记</a>
        <a href="/" aria-label="心纪元首页">
          <img
            src="/xinera/logo-pixel-96-mono.png"
            alt=""
            width="42"
            height="42"
          />
        </a>
        <a href="/account">玩家中心 ↗</a>
      </header>
      <main id="main">
        <article>
          <div className="article-cover">
            <img
              src={entry.image}
              alt={entry.summary}
              fetchPriority="high"
              style={{ viewTransitionName: `${entry.slug}-photo` }}
            />
            <div className="article-shade" />
            <div className="article-caption">
              <p>心纪元 / 旅途手记</p>
              <h1>{entry.title}</h1>
            </div>
          </div>
          <div className="article-body">
            <aside>
              <span>故事中的地方</span>
              <p>{entry.place}</p>
              <a href={`/world?place=${entry.slug}`}>返回场景 ↗</a>
            </aside>
            <div className="article-copy">
              {entry.sections.map((section, i) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                  {i === 0 && (
                    <img
                      src={entry.image}
                      alt={`${entry.place}的世界场景`}
                      loading="lazy"
                    />
                  )}
                </section>
              ))}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
