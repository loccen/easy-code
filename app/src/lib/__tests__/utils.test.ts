import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cn,
  formatPrice,
  formatFileSize,
  generateRandomString,
  delay,
  isValidEmail,
  truncateText
} from '../utils';

describe('Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-4', 'py-2', 'bg-blue-500');
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });

    it('should handle conditional classes', () => {
      const result = cn('px-4', true && 'py-2', false && 'hidden');
      expect(result).toBe('px-4 py-2');
    });

    it('should merge conflicting Tailwind classes', () => {
      const result = cn('px-4 px-6', 'py-2');
      expect(result).toBe('px-6 py-2');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle arrays and objects', () => {
      const result = cn(['px-4', 'py-2'], { 'bg-blue-500': true, 'hidden': false });
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });
  });

  describe('formatPrice', () => {
    it('should format price correctly', () => {
      expect(formatPrice(100)).toBe('100 积分');
      expect(formatPrice(1000)).toBe('1,000 积分');
      expect(formatPrice(1234567)).toBe('1,234,567 积分');
    });

    it('should handle zero price', () => {
      expect(formatPrice(0)).toBe('0 积分');
    });

    it('should handle decimal prices', () => {
      expect(formatPrice(99.99)).toBe('99.99 积分');
    });

    it('should handle negative prices', () => {
      expect(formatPrice(-100)).toBe('-100 积分');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 10)).toBe('10 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('should handle very large files', () => {
      const result = formatFileSize(1024 * 1024 * 1024 * 1024);
      // For files larger than GB, it should still use GB unit
      expect(result).toMatch(/^\d+(\.\d+)? GB$/);
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of correct length', () => {
      expect(generateRandomString(10)).toHaveLength(10);
      expect(generateRandomString(5)).toHaveLength(5);
      expect(generateRandomString(20)).toHaveLength(20);
    });

    it('should generate different strings on multiple calls', () => {
      const str1 = generateRandomString(10);
      const str2 = generateRandomString(10);
      expect(str1).not.toBe(str2);
    });

    it('should only contain valid characters', () => {
      const validChars = /^[A-Za-z0-9]+$/;
      const result = generateRandomString(100);
      expect(validChars.test(result)).toBe(true);
    });

    it('should handle zero length', () => {
      expect(generateRandomString(0)).toBe('');
    });

    it('should handle length of 1', () => {
      const result = generateRandomString(1);
      expect(result).toHaveLength(1);
      expect(/^[A-Za-z0-9]$/.test(result)).toBe(true);
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      const elapsed = end - start;
      
      // Allow some tolerance for timing
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });

    it('should return a promise', () => {
      const result = delay(10);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle zero delay', async () => {
      const start = Date.now();
      await delay(0);
      const end = Date.now();
      const elapsed = end - start;

      // Zero delay should complete quickly, but allow some tolerance for execution time
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
      expect(isValidEmail('123@456.789')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@invalid.com')).toBe(false);
      expect(isValidEmail('invalid@.com')).toBe(false);
      expect(isValidEmail('invalid.com')).toBe(false);
      expect(isValidEmail('invalid@com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.c')).toBe(true); // Minimal valid email
      expect(isValidEmail('test@test')).toBe(false); // No TLD
      expect(isValidEmail('test test@example.com')).toBe(false); // Space in local part
      expect(isValidEmail('test@exam ple.com')).toBe(false); // Space in domain
    });
  });

  describe('truncateText', () => {
    it('should truncate text when longer than maxLength', () => {
      const text = 'This is a very long text that should be truncated';
      expect(truncateText(text, 20)).toBe('This is a very long ...');
    });

    it('should return original text when shorter than maxLength', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe('Short text');
    });

    it('should return original text when equal to maxLength', () => {
      const text = 'Exactly twenty chars';
      expect(truncateText(text, 20)).toBe('Exactly twenty chars');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle zero maxLength', () => {
      expect(truncateText('Some text', 0)).toBe('...');
    });

    it('should handle very short maxLength', () => {
      expect(truncateText('Hello world', 3)).toBe('Hel...');
    });

    it('should handle single character', () => {
      expect(truncateText('A', 5)).toBe('A');
      expect(truncateText('A', 0)).toBe('...');
    });
  });
});
