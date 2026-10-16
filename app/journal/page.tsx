import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Records } from "@/features/journal/records";
export const metadata = {
  title: "旅途手记",
  description:
    "从奥摩西亚的逃难之路，到西奥格勒的骑士誓言。读一页心纪元的故事，再踏上旅途。",
  alternates: { canonical: "/journal" },
};
export default function JournalPage() {
  return (
    <>
      <Header />
      <main id="main">
        <Records standalone />
      </main>
      <Footer />
    </>
  );
}
