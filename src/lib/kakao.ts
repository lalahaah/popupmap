export function loadKakaoMap(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Browser only'));
    }
    
    // 이미 로드된 경우
    if (window.kakao && window.kakao.maps) {
      return resolve();
    }

    // 로딩 중인 경우 방지
    const existingScript = document.getElementById('kakao-map-script');
    if (existingScript) {
      const checkLoad = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkLoad);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-script';
    // autoload=false 필수
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`;
    
    script.onload = () => {
      window.kakao.maps.load(() => {
        resolve();
      });
    };

    script.onerror = (err) => {
      reject(err);
    };

    document.head.appendChild(script);
  });
}
