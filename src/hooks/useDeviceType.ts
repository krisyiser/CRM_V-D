"use client";
import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceState {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

export function useDeviceType(): DeviceState {
  const [deviceState, setDeviceState] = useState<DeviceState>({
    deviceType: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    orientation: typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const ua = navigator.userAgent.toLowerCase();
      
      const isMobileUA = /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua);
      const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(ua) || (isTouchDevice && width >= 600 && width <= 1024);

      let type: DeviceType = 'desktop';
      if (width < 640 || (isMobileUA && width < 768)) {
        type = 'mobile';
      } else if (width < 1024 || isTabletUA) {
        type = 'tablet';
      } else {
        type = 'desktop';
      }

      setDeviceState({
        deviceType: type,
        isMobile: type === 'mobile',
        isTablet: type === 'tablet',
        isDesktop: type === 'desktop',
        isTouch: isTouchDevice,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait'
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return deviceState;
}
