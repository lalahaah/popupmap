import { Popup } from '@/types/popup';

export function getPopupPinHtml(popup: Popup): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dDayText = '';
  let isNew = false;

  if (popup.endDate) {
    const end = new Date(popup.endDate);
    end.setHours(0, 0, 0, 0);
    const diffTimeEnd = end.getTime() - today.getTime();
    const diffDaysEnd = Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24));

    if (diffDaysEnd <= 3 && diffDaysEnd >= 0) {
      dDayText = `D-${diffDaysEnd === 0 ? 'DAY' : diffDaysEnd}`;
    } else if (diffDaysEnd < 0) {
      dDayText = 'END';
    } else {
      dDayText = `D-${diffDaysEnd}`;
    }
  }

  if (popup.startDate) {
    const start = new Date(popup.startDate);
    start.setHours(0, 0, 0, 0);
    const diffTimeStart = today.getTime() - start.getTime();
    const diffDaysStart = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));
    
    if (diffDaysStart >= 0 && diffDaysStart <= 1) {
      isNew = true;
      dDayText = 'NEW';
    }
  }

  if (!dDayText) dDayText = 'D-?';

  const badgeClass = isNew 
    ? 'bg-brandRed !text-white' 
    : '';

  return `
    <div class="relative cursor-pointer hover:-translate-y-1 transition-transform" title="${popup.name}">
      <div class="stub px-2 py-1 text-[10px] font-mono font-bold border-2 border-ink ${badgeClass}">
        ${dDayText}
      </div>
    </div>
  `;
}
