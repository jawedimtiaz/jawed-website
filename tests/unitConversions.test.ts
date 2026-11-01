import { describe, it, expect } from 'vitest';
import {
  convertMetersToFeet,
  convertFeetToMeters,
  convertMmToInches,
  convertInchesToMm,
  convertCelsiusToFahrenheit,
  convertFahrenheitToCelsius,
  convertKgToLbs,
  convertLbsToKg,
} from '../src/utils/unitConversions';

describe('Metric vs Imperial Conversion Utility', () => {
  describe('Distance (Meters <-> Feet)', () => {
    it('converts standard meters to feet correctly', () => {
      const feet = convertMetersToFeet(10);
      expect(feet).toBeCloseTo(32.8084, 3);
    });

    it('converts feet to meters correctly', () => {
      const meters = convertFeetToMeters(32.8084);
      expect(meters).toBeCloseTo(10, 3);
    });

    it('handles zero and negative distance inputs', () => {
      expect(convertMetersToFeet(0)).toBe(0);
      expect(convertMetersToFeet(-5)).toBeCloseTo(-16.4042, 3);
      expect(convertFeetToMeters(-10)).toBeCloseTo(-3.048, 3);
    });

    it('handles extreme distance values', () => {
      expect(convertMetersToFeet(1_000_000)).toBeCloseTo(3_280_840, 0);
      expect(convertMetersToFeet(-1_000_000)).toBeCloseTo(-3_280_840, 0);
    });
  });

  describe('Short Distance (Millimeters <-> Inches)', () => {
    it('converts mm to inches correctly', () => {
      const inches = convertMmToInches(25.4);
      expect(inches).toBe(1);
    });

    it('converts inches to mm correctly', () => {
      const mm = convertInchesToMm(2);
      expect(mm).toBe(50.8);
    });

    it('handles zero and negative inputs', () => {
      expect(convertMmToInches(0)).toBe(0);
      expect(convertMmToInches(-25.4)).toBe(-1);
      expect(convertInchesToMm(-5)).toBe(-127);
    });

    it('handles extreme short distance values', () => {
      expect(convertMmToInches(100_000)).toBeCloseTo(3937.00787, 3);
    });
  });

  describe('Temperature (Celsius <-> Fahrenheit)', () => {
    it('converts freezing point correctly', () => {
      expect(convertCelsiusToFahrenheit(0)).toBe(32);
      expect(convertFahrenheitToCelsius(32)).toBe(0);
    });

    it('converts boiling point correctly', () => {
      expect(convertCelsiusToFahrenheit(100)).toBe(212);
      expect(convertFahrenheitToCelsius(212)).toBe(100);
    });

    it('converts negative and extreme temperatures correctly', () => {
      // -40°C is equal to -40°F
      expect(convertCelsiusToFahrenheit(-40)).toBe(-40);
      expect(convertFahrenheitToCelsius(-40)).toBe(-40);

      // Absolute zero in Celsius (-273.15 °C)
      const absZeroF = convertCelsiusToFahrenheit(-273.15);
      expect(absZeroF).toBeCloseTo(-459.67, 2);
    });
  });

  describe('Weight / Mass (Kilograms <-> Pounds)', () => {
    it('converts kg to lbs correctly', () => {
      const lbs = convertKgToLbs(10);
      expect(lbs).toBeCloseTo(22.0462, 3);
    });

    it('converts lbs to kg correctly', () => {
      const kg = convertLbsToKg(22.0462);
      expect(kg).toBeCloseTo(10, 3);
    });

    it('handles zero and negative weights', () => {
      expect(convertKgToLbs(0)).toBe(0);
      expect(convertKgToLbs(-5)).toBeCloseTo(-11.0231, 3);
      expect(convertLbsToKg(-22.0462)).toBeCloseTo(-10, 3);
    });

    it('handles extreme weights', () => {
      expect(convertKgToLbs(50_000)).toBeCloseTo(110_231, 0);
    });
  });
});
