/**
 * Format amount as Sri Lankan Rupees (LKR)
 * @param amount - The amount to format
 * @returns Formatted string with "Rs." prefix
 */
export const formatCurrency = (amount: number): string => {
  return `Rs. ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

/**
 * Format amount as Sri Lankan Rupees (LKR) without prefix
 * @param amount - The amount to format
 * @returns Formatted string without prefix
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
