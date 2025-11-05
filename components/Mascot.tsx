import React from 'react';
import { ConversationStatus } from '../types';

// =================================================================
// MASCOT ASSET
// You can replace this with a Base64 encoded sprite sheet of your own character.
// The sprite sheet should be horizontal, with 3 frames of equal size.
// Frame 1: Idle, Frame 2: Listening, Frame 3: Talking
// =================================================================
const MASCOT_SPRITE_SHEET = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYwAAABQCAYAAAC22+33AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARJSURBVHhe7d1/aBxlHMbxR0yzh0q1tFpqu2ihFcvWFlTpitJAwVYLBUVcvKhgKysIKuhCxYt/oIWiIlZ0pYu2hVqx0IqCtUWFoii22kOtHUnPMy9fMvCSyUmSk7yZ/Dx5v+HkJA/eB3k3c3nzk4S83BqJSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIRGSAkhxIT/x5s2b/5ub29/b2lp+XN/f/+Zubn5w7m5uXU1Y4z55eXldfPz838xJpPJv3V2drZ2bYyJ4fHx8Ynj4+P/McbY1dXVrB2NiSF1dfU1xsbG/jHGfG5ubtYOYmKEWJaXl0tLS0tZliXDMGZmZtYOYmKEWJaXlyVJEozh4eErR0dH2kEMjDDr6+vlMAzDMK6vr7e/v18HyMIIMc2yLOu6DMNsbW3t7u5uB8jCCDHNsizLMs/z/f39y8vL2kEMjDDjOM7zPK7rysoqDEM7QBYGqLuuO45jjGFERka6u7vbATKwgDrbtm3btm3bsiw7ODgwxjQgA/XLHMfY2NjY3NyMMQBDoAEy0L/Msaurq7u7u3Nzc0MI0AAMtC8D5DiOIAgA+vp6REREmJqaGhsba2pqQhAEBwcHxpjOzk6lUunt7W2M2d/fV6vVzMzMMMb09PSwsDDGmJubm5+f39jYMDMzwxij0ej58+fNZvPOzg4A9vb2RCJxdnb29PSMMQCAoijf39/NZvP4+Pjq6qpz5861tbX5+vpyHAeAMQaA8+fPa2trWZbFGGpra1NTU3NzcxMTE4wxuq5RFMXv37/f3NyMMQCAoihBEJqbmwFAURTbtm3LssVi0alTp1xdXeV53traYjAYGIaRZRlhGGEYBrZta9s2xhAEgWEYiqKsrKzYtu38/HxhYcHv37/v7u4wxoIgWJblcrkaDAaxWExRlGazOT097ffv38VisclkEgTBGHO5XKPRaGxsrMvlIggC0zRBEKxWq3med3Z2FAqFDMNYliVN0/R9f2BgIC8v7+DgYG5uDoBBEGEYRtM0kiTxPC8IAuM4juM4TdPW1tZisfj4+PjS0pLZ2VlVVTkMA8dxjDGGYbIsK4qiKIrjOMdxjDEAwGazubq62tfX53ne0dExPz+/r6/PNE0URbIsK4qiaZrjOEIIIcSETkgJIcSETkgJIcSETkgJIcSETkgJIcSETkgJIcSETkgJIcSETkgJIZX5B+0R2J2/L74+AAAAAElFTkSuQmCC';

interface MascotProps {
    status: ConversationStatus | string;
}

export const Mascot: React.FC<MascotProps> = ({ status }) => {
    const isListening = status === ConversationStatus.LISTENING;
    const isSpeaking = status === ConversationStatus.SPEAKING;
    const isIdle = !isListening && !isSpeaking;

    let backgroundPosition = '0 0'; // Idle
    let animationName = 'mascot-idle';
    if (isListening) {
        backgroundPosition = '-150px 0'; // Listening frame
        animationName = 'mascot-listen';
    } else if (isSpeaking) {
        animationName = 'mascot-speak';
    }

    return (
        <div className="relative w-[150px] h-[80px]">
            <div
                className="w-[150px] h-[80px] bg-no-repeat"
                style={{
                    backgroundImage: `url(${MASCOT_SPRITE_SHEET})`,
                    backgroundPosition: backgroundPosition,
                    animationName: animationName,
                    animationDuration: isSpeaking ? '0.4s' : '3s',
                    animationIterationCount: 'infinite',
                    animationTimingFunction: isSpeaking ? 'steps(1)' : 'ease-in-out',
                }}
            />
            <style>{`
                @keyframes mascot-speak {
                    0% { background-position: -150px 0; }
                    50% { background-position: -300px 0; }
                    100% { background-position: -150px 0; }
                }
                @keyframes mascot-idle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                 @keyframes mascot-listen {
                    0%, 100% { transform: scale(1.0); }
                    50% { transform: scale(1.05); }
                }
            `}</style>
        </div>
    );
};
