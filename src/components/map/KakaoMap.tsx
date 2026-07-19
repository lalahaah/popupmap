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
  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    async function initMap() {
      try {
        await loadKakaoMap();
        if (mapRef.current && !map) {
          const options = {
            center: new window.kakao.maps.LatLng(37.544, 127.055), // 성수동 중심
            level: 5,
          };
          const newMap = new window.kakao.maps.Map(mapRef.current, options);
          setMap(newMap);
          
          // 컨테이너 크기가 늦게 확정되는 경우 대비
          setTimeout(() => {
            newMap.relayout();
            window.kakao.maps.event.trigger(newMap, 'resize');
          }, 100);
        }
      } catch (err) {
        console.error('Failed to load Kakao map', err);
      }
    }
    initMap();
  }, [map]);

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
        yAnchor: 1, // 핀의 꼬리가 위치를 가리키도록 정렬
      });

      customOverlay.setMap(map);
      overlaysRef.current.push(customOverlay);
    });
  }, [map, popups]);

  return (
    <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
  );
}
