export function formatFileSize(bytes) {
  const isNumericValue = typeof bytes === "number"
    || (typeof bytes === "string" && bytes.trim() !== "");
  const sizeInBytes = isNumericValue ? Number(bytes) : NaN;
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) return "0 Bytes";

  const units = ["Byte", "KB", "MB", "GB"];
  let size = sizeInBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formattedSize = size.toFixed(2).replace(/\.?0+$/, "");
  const unit = unitIndex === 0 && size !== 1 ? "Bytes" : units[unitIndex];
  return `${formattedSize} ${unit}`;
}
