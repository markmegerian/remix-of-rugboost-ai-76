export default function GradientMeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      
      {/* Animated mesh blobs */}
      <div 
        className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-30 blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
          animationDuration: '8s',
        }}
      />
      
      <div 
        className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.4) 0%, transparent 70%)',
          animationDuration: '10s',
          animationDelay: '2s',
        }}
      />
      
      <div 
        className="absolute bottom-0 right-1/4 w-1/3 h-1/3 rounded-full opacity-25 blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          animationDuration: '12s',
          animationDelay: '4s',
        }}
      />
      
      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
