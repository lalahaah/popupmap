'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadKakaoMap } from '@/lib/kakao';
import { Popup } from '@/types/popup';
import { getPopupPinHtml } from './PopupPin';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  popups: Popup[];
  onSelectPopup?: (popup: Popup) => void;
}

export function KakaoMap({ popups, onSelectPopup }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    let observer: ResizeObserver | null = null;

    async function init() {
      try {
        await loadKakaoMap();
        
        if (!mapRef.current) return;

        observer = new ResizeObserver((entries) => {
          for (let entry of entries) {
            const { width, height } = entry.contentRect;
            
            // 아직 크기가 없으면 대기
            if (width === 0 || height === 0) continue;

            // 이미 지도가 생성되었으면 크기 변경에 맞춰 relayout 호출
            if (mapInstanceRef.current) {
              mapInstanceRef.current.relayout();
              continue;
            }

            console.log(`지도 생성 완료, 컨테이너 크기: ${width}x${height}`);
            
            const options = {
              center: new window.kakao.maps.LatLng(37.544, 127.055), // 성수동 중심
              level: 5,
            };
            
            const newMap = new window.kakao.maps.Map(mapRef.current, options);
            mapInstanceRef.current = newMap;
            setMap(newMap);


          }
        });

        observer.observe(mapRef.current);
      } catch (err) {
        console.error('Failed to load Kakao map', err);
      }
    }

    init();

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!map || !window.kakao) return;

    // Remove existing overlays
    overlaysRef.current.forEach(overlay => overlay.setMap(null));
    overlaysRef.current = [];

    // Add new overlays
    popups.forEach(popup => {
      const position = new window.kakao.maps.LatLng(popup.lat, popup.lng);
      
      const contentWrapper = document.createElement('div');
      contentWrapper.innerHTML = getPopupPinHtml(popup);
      if (onSelectPopup) {
        contentWrapper.addEventListener('click', () => {
          onSelectPopup(popup);
        });
      }

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: contentWrapper,
        yAnchor: 1,
        clickable: true,
      });

      customOverlay.setMap(map);
      overlaysRef.current.push(customOverlay);
    });
  }, [map, popups, onSelectPopup]);

  return (
    <div ref={mapRef} className="w-full h-full touch-none" style={{ width: '100%', height: '100%' }} />
  );
}
