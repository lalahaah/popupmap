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
  highlightedPopupId?: string | null;
  mapCenter?: { lat: number; lng: number };
  onMapMoved?: (lat: number, lng: number) => void;
}

export function KakaoMap({ popups, onSelectPopup, highlightedPopupId, mapCenter, onMapMoved }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<Array<{ id: string; overlay: any; popup: Popup }>>([]);

  useEffect(() => {
    let observer: ResizeObserver | null = null;

    async function init() {
      try {
        await loadKakaoMap();
        
        if (!mapRef.current) return;

        observer = new ResizeObserver((entries) => {
          for (let entry of entries) {
            const { width, height } = entry.contentRect;
            
            if (width === 0 || height === 0) continue;

            if (mapInstanceRef.current) {
              mapInstanceRef.current.relayout();
              continue;
            }

            console.log(`지도 생성 완료, 컨테이너 크기: ${width}x${height}`);
            
            const options = {
              center: new window.kakao.maps.LatLng(mapCenter?.lat || 37.544, mapCenter?.lng || 127.055), // 기본 성수동 중심
              level: 5,
            };
            
            const newMap = new window.kakao.maps.Map(mapRef.current, options);
            
            window.kakao.maps.event.addListener(newMap, 'dragend', () => {
              if (onMapMoved) {
                const center = newMap.getCenter();
                onMapMoved(center.getLat(), center.getLng());
              }
            });

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

    overlaysRef.current.forEach(item => item.overlay.setMap(null));
    overlaysRef.current = [];

    popups.forEach(popup => {
      const isHighlighted = popup.id === highlightedPopupId;
      const position = new window.kakao.maps.LatLng(popup.lat, popup.lng);
      
      const contentWrapper = document.createElement('div');
      contentWrapper.innerHTML = getPopupPinHtml(popup, isHighlighted);
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
        zIndex: isHighlighted ? 50 : 1,
      });

      customOverlay.setMap(map);
      overlaysRef.current.push({ id: popup.id, overlay: customOverlay, popup });
    });
  }, [map, popups]);

  useEffect(() => {
    if (!map || !window.kakao || overlaysRef.current.length === 0) return;

    overlaysRef.current.forEach(({ id, overlay, popup }) => {
      const isHighlighted = id === highlightedPopupId;
      const contentWrapper = document.createElement('div');
      contentWrapper.innerHTML = getPopupPinHtml(popup, isHighlighted);
      if (onSelectPopup) {
        contentWrapper.addEventListener('click', () => {
          onSelectPopup(popup);
        });
      }
      overlay.setContent(contentWrapper);
      overlay.setZIndex(isHighlighted ? 50 : 1);
    });

    const highlightedItem = overlaysRef.current.find(item => item.id === highlightedPopupId);
    if (highlightedItem && map) {
      const position = new window.kakao.maps.LatLng(highlightedItem.popup.lat, highlightedItem.popup.lng);
      map.panTo(position);
    }
  }, [highlightedPopupId, map]);

  useEffect(() => {
    if (map && mapCenter) {
      const position = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
      map.panTo(position);
    }
  }, [mapCenter, map]);

  return (
    <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
  );
}
