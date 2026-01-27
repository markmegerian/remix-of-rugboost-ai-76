import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type DeviceType = 
  | 'iphone-15-pro' 
  | 'iphone-15-pro-max' 
  | 'iphone-6.5-inch' 
  | 'iphone-6.5-inch-alt'
  | 'ipad-pro-12.9';

interface DeviceFrameProps {
  children: React.ReactNode;
  device: DeviceType;
  className?: string;
  scale?: number;
}

// Device specifications matching App Store requirements
export const DEVICE_SPECS = {
  'iphone-15-pro': {
    name: 'iPhone 15 Pro (6.1")',
    width: 1179,
    height: 2556,
    displayWidth: 393,
    displayHeight: 852,
    cornerRadius: 55,
    notchWidth: 126,
    dynamicIsland: true,
    hasNotch: false,
  },
  'iphone-15-pro-max': {
    name: 'iPhone 15 Pro Max (6.7")',
    width: 1290,
    height: 2796,
    displayWidth: 430,
    displayHeight: 932,
    cornerRadius: 60,
    notchWidth: 126,
    dynamicIsland: true,
    hasNotch: false,
  },
  'iphone-6.5-inch': {
    name: 'iPhone 6.5" (1242×2688)',
    width: 1242,
    height: 2688,
    displayWidth: 414,
    displayHeight: 896,
    cornerRadius: 50,
    notchWidth: 160,
    dynamicIsland: false,
    hasNotch: true,
  },
  'iphone-6.5-inch-alt': {
    name: 'iPhone 6.5" (1284×2778)',
    width: 1284,
    height: 2778,
    displayWidth: 428,
    displayHeight: 926,
    cornerRadius: 53,
    notchWidth: 126,
    dynamicIsland: false,
    hasNotch: true,
  },
  'ipad-pro-12.9': {
    name: 'iPad Pro 12.9"',
    width: 2048,
    height: 2732,
    displayWidth: 1024,
    displayHeight: 1366,
    cornerRadius: 18,
    notchWidth: 0,
    dynamicIsland: false,
    hasNotch: false,
  },
};

const DeviceFrame = forwardRef<HTMLDivElement, DeviceFrameProps>(({ 
  children, 
  device, 
  className,
  scale = 0.35,
}, ref) => {
  const specs = DEVICE_SPECS[device];
  const isIpad = device.includes('ipad');
  const frameWidth = specs.displayWidth * scale;
  const frameHeight = specs.displayHeight * scale;
  const framePadding = isIpad ? 10 : 6;
  const innerRadius = Math.max(0, specs.cornerRadius - 8) * scale;
  
  return (
    <div 
      ref={ref}
      className={cn("relative inline-block", className)}
      style={{
        width: frameWidth + framePadding * 2,
        height: frameHeight + framePadding * 2,
      }}
    >
      {/* Device outer frame - titanium look */}
      <div 
        className="absolute inset-0"
        style={{
          borderRadius: specs.cornerRadius * scale,
          background: 'linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 50%, #2c2c2e 100%)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          padding: framePadding,
        }}
      >
        {/* Screen area */}
        <div 
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: innerRadius,
            backgroundColor: '#000',
          }}
        >
          {/* Dynamic Island (iPhone 14 Pro+) */}
          {specs.dynamicIsland && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-black z-30"
              style={{
                top: 8 * scale,
                width: specs.notchWidth * scale,
                height: 34 * scale,
                borderRadius: 17 * scale,
              }}
            />
          )}
          
          {/* Classic Notch (iPhone X - 13) */}
          {specs.hasNotch && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-black z-30"
              style={{
                top: 0,
                width: specs.notchWidth * scale,
                height: 30 * scale,
                borderBottomLeftRadius: 20 * scale,
                borderBottomRightRadius: 20 * scale,
              }}
            />
          )}
          
          {/* Screen content container - this scales the content */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              backgroundColor: 'hsl(var(--background))',
            }}
          >
            <div 
              style={{
                width: specs.displayWidth,
                height: specs.displayHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {children}
            </div>
          </div>
          
          {/* Status bar overlay */}
          <div 
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between"
            style={{ 
              height: 48 * scale, 
              paddingLeft: 24 * scale,
              paddingRight: 24 * scale,
              paddingTop: specs.dynamicIsland ? 14 * scale : 8 * scale,
            }}
          >
            <span 
              className="font-semibold text-foreground"
              style={{ fontSize: 15 * scale }}
            >
              9:41
            </span>
            <div className="flex items-center" style={{ gap: 4 * scale }}>
              {/* Signal bars */}
              <div className="flex items-end" style={{ gap: 1 * scale }}>
                {[0.4, 0.6, 0.8, 1].map((h, i) => (
                  <div 
                    key={i}
                    className="bg-foreground rounded-sm"
                    style={{ 
                      width: 3 * scale, 
                      height: 12 * h * scale 
                    }}
                  />
                ))}
              </div>
              {/* WiFi */}
              <svg 
                viewBox="0 0 24 24" 
                className="text-foreground fill-current"
                style={{ width: 16 * scale, height: 16 * scale }}
              >
                <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0-6c2.8 0 5.3 1.1 7.2 3l-1.4 1.4C16.1 14.9 14.1 14 12 14s-4.1.9-5.8 2.4L4.8 15c1.9-1.9 4.4-3 7.2-3zm0-6c4.5 0 8.6 1.8 11.6 4.8l-1.4 1.4C19.6 9.6 16 8 12 8S4.4 9.6 1.8 12.2L.4 10.8C3.4 7.8 7.5 6 12 6z"/>
              </svg>
              {/* Battery */}
              <div 
                className="flex items-center"
                style={{ marginLeft: 4 * scale, gap: 1 * scale }}
              >
                <div 
                  className="border border-foreground/80 rounded-sm flex items-center p-px"
                  style={{ 
                    width: 25 * scale, 
                    height: 12 * scale,
                    borderWidth: scale,
                  }}
                >
                  <div 
                    className="bg-green-500 rounded-sm"
                    style={{ 
                      width: 20 * scale, 
                      height: 8 * scale,
                      marginLeft: scale,
                    }}
                  />
                </div>
                <div 
                  className="bg-foreground/80 rounded-r-sm"
                  style={{ 
                    width: 2 * scale, 
                    height: 5 * scale 
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Home indicator (iPhone only) */}
          {!isIpad && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-foreground/60 rounded-full z-20"
              style={{
                bottom: 8 * scale,
                width: 134 * scale,
                height: 5 * scale,
              }}
            />
          )}
        </div>
      </div>
      
      {/* Side buttons (aesthetic only) */}
      {!isIpad && (
        <>
          {/* Silent switch */}
          <div 
            className="absolute rounded-sm"
            style={{
              left: -2 * scale,
              top: 80 * scale,
              width: 3 * scale,
              height: 28 * scale,
              background: 'linear-gradient(90deg, #2c2c2e 0%, #3a3a3c 100%)',
            }}
          />
          {/* Volume up */}
          <div 
            className="absolute rounded-sm"
            style={{
              left: -2 * scale,
              top: 130 * scale,
              width: 3 * scale,
              height: 56 * scale,
              background: 'linear-gradient(90deg, #2c2c2e 0%, #3a3a3c 100%)',
            }}
          />
          {/* Volume down */}
          <div 
            className="absolute rounded-sm"
            style={{
              left: -2 * scale,
              top: 200 * scale,
              width: 3 * scale,
              height: 56 * scale,
              background: 'linear-gradient(90deg, #2c2c2e 0%, #3a3a3c 100%)',
            }}
          />
          {/* Power button */}
          <div 
            className="absolute rounded-sm"
            style={{
              right: -2 * scale,
              top: 160 * scale,
              width: 3 * scale,
              height: 80 * scale,
              background: 'linear-gradient(270deg, #2c2c2e 0%, #3a3a3c 100%)',
            }}
          />
        </>
      )}
    </div>
  );
});

DeviceFrame.displayName = 'DeviceFrame';

export default DeviceFrame;
