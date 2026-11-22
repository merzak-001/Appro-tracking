export const formatDateDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  
  // If already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle ISO strings with T or simple YYYY-MM-DD
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
};

