'use client';

import { useEffect } from 'react';

interface AdSenseRefresherProps {
  adSlot?: string;
  adClient?: string;
  nodeId: string;
}

export default function AdSenseRefresher({ adSlot, adClient, nodeId }: AdSenseRefresherProps) {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_ADSENSE === 'true';
  const client = adClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-1234567890123456';
  const slot = adSlot || process.env.NEXT_PUBLIC_ADSENSE_SLOT || '1234567890';

  useEffect(() => {
    if (!isEnabled) return;
    
    // SPA에서 AdSense 광고 단위를 동적으로 새로고침(Refresh)하기 위한 push 호출
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.warn('AdSense push warning (expected if script is blocked or key not filled):', err);
    }
  }, [nodeId, isEnabled]);

  if (!isEnabled) {
    return null; // 공모전 제출용 등으로 비활성화 시 노출 없음 (DOM 구조에서 완전히 제거)
  }

  return (
    <div key={nodeId} className="w-full flex flex-col items-center justify-center p-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl overflow-hidden min-h-[280px]">
      <p className="text-[10px] text-gray-400 mb-2 font-medium">ADVERTISEMENT</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '300px', height: '250px' }}
        data-ad-client={client}
        data-ad-slot={slot}
      />
    </div>
  );
}
