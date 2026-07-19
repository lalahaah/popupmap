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
}

export function KakaoMap({ popups }: KakaoMapProps) {
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

            // 이미 지도가 생성되었으면 무시
            if (mapInstanceRef.current) return;

            console.log(`지도 생성 완료, 컨테이너 크기: ${width}x${height}`);
            
            const options = {
              center: new window.kakao.maps.LatLng(37.544, 127.055), // 성수동 중심
              level: 5,
            };
            
            const newMap = new window.kakao.maps.Map(mapRef.current, options);
            mapInstanceRef.current = newMap;
            setMap(newMap);

            // 초기화 후 observer 해제
            if (observer) {
              observer.disconnect();
            }
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
      
      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: getPopupPinHtml(popup),
        yAnchor: 1,
      });

      customOverlay.setMap(map);
      overlaysRef.current.push(customOverlay);
    });
  }, [map, popups]);

  return (
    <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
  );
}
