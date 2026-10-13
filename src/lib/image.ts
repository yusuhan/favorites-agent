// 浏览器端：把截图压成 JPEG data URL 再上传。宽度最多 1080，总像素有上限，长截图会整体缩小但保持比例
const MAX_WIDTH = 1080;
const MAX_PIXELS = 1080 * 4800;

export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const pixels = bitmap.width * scale * bitmap.height * scale;
  if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持处理图片");
  ctx.fillStyle = "#fff"; // 透明 PNG 转 JPEG 时背景填白
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
