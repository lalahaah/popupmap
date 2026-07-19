import { Sidebar } from "@/components/layout/Sidebar";

export default function Home() {
  return (
    <div className="relative h-full w-full flex">
      <Sidebar />
      {/* ===================== MAP AREA ===================== */}
      <main className="flex-1 relative map-bg h-full">
        {/* top-right controls */}
        <div className="absolute top-5 right-5 z-10 flex flex-col gap-2">
          <button className="w-11 h-11 bg-[var(--card)] border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </button>
        </div>

        {/* pins placeholder */}
        <div className="pin absolute" style={{ top: '22%', left: '38%' }}>
          <div className="stub px-2 py-1 text-[10px] mono">D-2</div>
        </div>
        <div className="pin absolute" style={{ top: '38%', left: '55%' }}>
          <div className="bg-[var(--red)] text-white border-2 border-[var(--ink)] px-2 py-1 text-[10px] font-bold mono">NEW</div>
        </div>
        <div className="pin absolute" style={{ top: '52%', left: '32%' }}>
          <div className="bg-[var(--card)] border-2 border-[var(--ink)] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">5</div>
        </div>
        <div className="pin absolute" style={{ top: '65%', left: '60%' }}>
          <div className="stub px-2 py-1 text-[10px] mono">D-9</div>
        </div>
        <div className="pin absolute" style={{ top: '44%', left: '70%' }}>
          <div className="bg-[var(--yellow)] border-2 border-[var(--ink)] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">3</div>
        </div>
        <div className="pin absolute" style={{ top: '75%', left: '44%' }}>
          <div className="stub px-2 py-1 text-[10px] mono">D-5</div>
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[var(--card)] border-2 border-[var(--ink)] px-4 py-2 text-xs font-bold shadow-[3px_3px_0_var(--ink)]">
          지도를 움직이면 이 지역 팝업으로 다시 검색
        </div>
      </main>
    </div>
  );
}
