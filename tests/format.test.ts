import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Settings, DateTime } from 'luxon';
import { getDateArray, formatDate, formatDuration } from '../src/lib/format';

describe('format library', () => {
  const fixedNow = new Date('2025-06-23T12:00:00Z');

  beforeEach(() => {
    Settings.now = () => fixedNow.getTime();
  });

  afterEach(() => {
    Settings.now = () => Date.now();
  });

  it('parses absolute dates correctly', () => {
    const result = getDateArray('Tuesday, July 1', '5:30 PM');
    expect(result).toEqual([2025, 7, 1, 22, 30]);
  });

  it('parses Tomorrow correctly', () => {
    const result = getDateArray('Tomorrow', '6:15 AM');
    expect(result).toEqual([2025, 6, 24, 11, 15]);
  });

  it('formats full date-time arrays', () => {
    const out = formatDate([2025, 7, 1, 22, 30]);
    expect(out).toBe('20250701T223000Z');
  });

  it('formats date-only arrays', () => {
    const out = formatDate([2025, 7, 1]);
    expect(out).toBe('20250701');
  });

  it('formats durations', () => {
    expect(formatDuration({ hours: 1, minutes: 30 })).toBe('PT1H30M');
    expect(formatDuration({ weeks: 1, days: 2 })).toBe('P1W2D');
    expect(formatDuration({})).toBe('P');
  });

  describe('Real Game Data Parsing', () => {
    let originalNow: typeof Settings.now;
    
    beforeEach(() => {
      originalNow = Settings.now;
      // Mock current time to August 12, 2024 for testing real game scenarios
      const augustMock = new Date('2024-08-12T20:00:00Z'); // 3 PM CDT
      Settings.now = () => augustMock.getTime();
    });

    afterEach(() => {
      Settings.now = originalNow;
    });

    it('should parse real game data correctly', () => {
      // Test with actual game data from browser output  
      // Note: These dates will be parsed as 2025 due to the main test's time mock
      const games = [
        { date: "Wednesday, August 13", time: "7:00 PM", expectedUTC: [2025, 8, 14, 0, 0] },
        { date: "Thursday, August 7", time: "7:10 PM", expectedUTC: [2025, 8, 8, 0, 10] },
        { date: "Wednesday, August 6", time: "7:00 PM", expectedUTC: [2025, 8, 7, 0, 0] },
        { date: "Thursday, July 31", time: "8:05 PM", expectedUTC: [2025, 8, 1, 1, 5] },
        { date: "Wednesday, July 30", time: "7:00 PM", expectedUTC: [2025, 7, 31, 0, 0] },
        { date: "Thursday, July 24", time: "6:15 PM", expectedUTC: [2025, 7, 24, 23, 15] }
      ];

      games.forEach(({ date, time, expectedUTC }) => {
        const result = getDateArray(date, time);
        expect(result).toEqual(expectedUTC);
      });
    });

    it('should handle edge cases around midnight', () => {
      const result1 = getDateArray('Friday, August 9', '11:45 PM');
      const result2 = getDateArray('Saturday, August 10', '12:15 AM');
      
      // 11:45 PM CDT = 04:45 UTC next day
      expect(result1).toEqual([2024, 8, 10, 4, 45]);
      
      // 12:15 AM CDT = 05:15 UTC same day  
      expect(result2).toEqual([2024, 8, 10, 5, 15]);
    });

    it('should handle AM times correctly', () => {
      const result = getDateArray('Saturday, August 10', '10:30 AM');
      
      // 10:30 AM CDT = 15:30 UTC (same day)
      expect(result).toEqual([2024, 8, 10, 15, 30]);
    });

    it('should log errors for invalid date formats and use fallback', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = getDateArray('Invalid Date Format', '7:00 PM');
      
      // Should fallback to current time when parsing fails
      expect(result[0]).toBe(2024); // Current year
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse date: "Invalid Date Format"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle year transitions correctly', () => {
      // Temporarily mock current time to late December
      const originalMock = Settings.now;
      const lateDec = new Date('2024-12-20T20:00:00Z');
      Settings.now = () => lateDec.getTime();

      try {
        // A January date should be parsed as next year
        const result = getDateArray('Wednesday, January 15', '7:00 PM');
        
        expect(result[0]).toBe(2025); // Should be year 2025
        expect(result[1]).toBe(1);    // January
        expect(result[2]).toBe(16);   // Jan 15 7PM CST = Jan 16 01:00 UTC (no DST in winter)
      } finally {
        Settings.now = originalMock;
      }
    });
  });

  describe('ICS Integration Tests', () => {
    let originalNow: typeof Settings.now;
    
    beforeEach(() => {
      originalNow = Settings.now;
      const augustMock = new Date('2024-08-12T20:00:00Z');
      Settings.now = () => augustMock.getTime();
    });

    afterEach(() => {
      Settings.now = originalNow;
    });

    it('should convert game time to correct ICS format', () => {
      // Real example: "Wednesday, August 13" at "7:00 PM"
      const dateArray = getDateArray('Wednesday, August 13', '7:00 PM');
      const icsDate = formatDate(dateArray);
      
      // 7:00 PM CDT = 12:00 AM UTC next day (during DST)
      // Note: Will be 2025 due to main test's time mock
      expect(icsDate).toBe('20250814T000000Z');
    });

    it('should handle multiple game times correctly', () => {
      const testCases = [
        { 
          date: 'Thursday, August 7', 
          time: '7:10 PM',
          expectedICS: '20250808T001000Z' // Aug 7 7:10 PM CDT = Aug 8 00:10 UTC (2025 due to mock)
        },
        { 
          date: 'Wednesday, July 30', 
          time: '7:00 PM',
          expectedICS: '20250731T000000Z' // July 30 7:00 PM CDT = July 31 00:00 UTC (2025 due to mock)
        },
        { 
          date: 'Thursday, July 24', 
          time: '6:15 PM',
          expectedICS: '20250724T231500Z' // July 24 6:15 PM CDT = July 24 23:15 UTC (2025 due to mock)
        }
      ];

      testCases.forEach(({ date, time, expectedICS }) => {
        const dateArray = getDateArray(date, time);
        const icsDate = formatDate(dateArray);
        expect(icsDate).toBe(expectedICS);
      });
    });

    it('should validate all parsed dates are reasonable', () => {
      const games = [
        { date: "Wednesday, August 13", time: "7:00 PM" },
        { date: "Thursday, August 7", time: "7:10 PM" },
        { date: "Wednesday, July 30", time: "7:00 PM" },
        { date: "Thursday, July 24", time: "6:15 PM" }
      ];

      games.forEach(game => {
        const result = getDateArray(game.date, game.time);
        
        // Should return valid 5-element array [year, month, day, hour, minute]
        expect(result).toHaveLength(5);
        expect(result[0]).toBeGreaterThanOrEqual(2024); // Valid year
        expect(result[1]).toBeGreaterThanOrEqual(1);    // Valid month
        expect(result[1]).toBeLessThanOrEqual(12);      // Valid month
        expect(result[2]).toBeGreaterThanOrEqual(1);    // Valid day
        expect(result[2]).toBeLessThanOrEqual(31);      // Valid day
        expect(result[3]).toBeGreaterThanOrEqual(0);    // Valid hour
        expect(result[3]).toBeLessThanOrEqual(23);      // Valid hour
        expect(result[4]).toBeGreaterThanOrEqual(0);    // Valid minute
        expect(result[4]).toBeLessThanOrEqual(59);      // Valid minute
      });
    });
  });
});
