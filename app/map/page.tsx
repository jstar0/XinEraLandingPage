import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { StepLink } from "@/components/site/step-link";
import "./map.css";

export const metadata = {
  title: "卫星地图",
  description:
    "心纪元世界的卫星地图入口。实时地图尚未搭建，先从世界巡游认识城镇与山海。",
  alternates: { canonical: "/map" },
};

function coordinate(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && Math.abs(number) <= 30_000_000
    ? number
    : undefined;
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ x?: string | string[]; z?: string | string[] }>;
}) {
  const params = await searchParams;
  const x = coordinate(params.x),
    z = coordinate(params.z);
  const hasLocation = x !== undefined && z !== undefined;
  return (
    <>
      <Header />
      <main id="main" className="satellite-page">
        <div className="satellite-heading">
          <div>
            <p>世界 / 卫星地图</p>
            <h1>在这里，找到方向。</h1>
          </div>
          <a href="/gallery">
            先去巡游 <span aria-hidden="true">↗</span>
          </a>
        </div>
        <section className="satellite-waiting" aria-labelledby="map-state">
          <div className="satellite-grid" aria-hidden="true" />
          <div className="satellite-status">
            <span /> 卫星地图 · 尚未开放
          </div>
          <div className="satellite-message">
            <span className="satellite-cross" aria-hidden="true">
              ＋
            </span>
            <h2 id="map-state">
              旅途需要方向，
              <br />
              地图正在准备。
            </h2>
            <p>
              这里将连接正在运行的 MC 世界，
              <br />
              寻找城镇、道路与旅途中的目的地。
            </p>
            {hasLocation && (
              <div className="satellite-location">
                <span>你在巡游中看到的位置</span>
                <strong>
                  X {x} <i>/</i> Z {z}
                </strong>
                <p>地图开放后，即可在这里定位。</p>
              </div>
            )}
            <StepLink
              href={hasLocation ? "/gallery?place=volcano" : "/gallery"}
            >
              先去巡游，认识这片世界
            </StepLink>
          </div>
          <p className="satellite-footnote">
            地图服务尚未搭建，当前没有显示实时世界数据。
          </p>
        </section>
        <div className="satellite-explanation">
          <p>
            <span>地图</span>找位置，看正在变化的世界。
          </p>
          <p>
            <span>世界巡游</span>出发之前，先看看城镇与远方山海。
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
