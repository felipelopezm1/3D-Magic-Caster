import { useRef, useState, useEffect, useCallback } from "react";

const COLORS = [
  { name: "black", hex: "#000000" },
  { name: "pink", hex: "#ff00ff" },
  { name: "cyan", hex: "#00bcd4" },
  { name: "yellow", hex: "#ffeb3b" },
  { name: "eraser", hex: "#ffffff" },
];

const SIZES = [3, 8, 16];

export function DrawingApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      const img = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (img) ctx.putImageData(img, 0, 0);
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(initCanvas);
  }, [initCanvas]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    lastPt.current = getPos(e);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !lastPt.current) return;
    const p = getPos(e);
    stroke(lastPt.current, p);
    lastPt.current = p;
  };
  const onMouseUp = () => { drawing.current = false; lastPt.current = null; };

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    lastPt.current = getTouchPos(e);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing.current || !lastPt.current) return;
    const p = getTouchPos(e);
    stroke(lastPt.current, p);
    lastPt.current = p;
  };
  const onTouchEnd = () => { drawing.current = false; lastPt.current = null; };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = "doodle.png";
    a.href = c.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="os-window drawing-app">
      <div className="title-bar">
        <div className="window-control" />
        <h1>Doodle Pad</h1>
        <div className="window-control" />
        <div className="window-control" />
      </div>
      <div className="inner-window">
        <div className="menu-bar">
          <span>Doodle</span>
        </div>
        <div className="drawing-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
        </div>
        <div className="drawing-toolbar">
          <button type="button" className="retro-btn" onClick={download}>EXPORT</button>
          <button type="button" className="retro-btn" onClick={clear}>OOPS!</button>
          <div className="drawing-colors">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`color-swatch ${color === c.hex ? "active" : ""} ${c.name === "eraser" ? "eraser" : ""}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.hex)}
                title={c.name}
              />
            ))}
          </div>
          <div className="drawing-sizes">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={`size-btn ${brushSize === s ? "active" : ""}`}
                onClick={() => setBrushSize(s)}
                title={`${s}px`}
              >
                <span className="size-dot" style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
