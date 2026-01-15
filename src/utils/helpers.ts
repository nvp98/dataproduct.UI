export const getFileNameFromContentDisposition = (
  disposition?: string
): string | null => {
  if (!disposition) return null;

  // Ưu tiên filename*=UTF-8''
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  // Fallback filename=
  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return null;
};

